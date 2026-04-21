// src/index.js
import { initSupabase, getSupabase } from "./supabase-client.js";
import { normalizeUrl } from "./url.js";
import { generateSelector } from "./selector.js";
import { calculatePinPosition, restorePinPosition } from "./pin.js";
import {
  getAnnotations,
  addAnnotation,
  clearAnnotations,
  setAnnotationMode,
} from "./state.js";
import { createAnnotation, createReply, deleteAnnotation, updateAnnotationStatus, uploadScreenshot, setApiKey } from "./api.js";
import { captureScreenshot } from "./screenshot.js";
import { STYLES } from "./ui/styles.js";
import { createFloatingButton } from "./ui/floating-button.js";
import {
  createOverlay,
  createHighlight,
  activateAnnotationMode,
  deactivateAnnotationMode,
  setupHighlighting,
  getElementUnderClick,
} from "./ui/annotation-mode.js";
import { createPinMarker, updatePinPosition } from "./ui/pin-marker.js";
import { createCommentPopover } from "./ui/comment-popover.js";
import { createThreadPopover } from "./ui/thread-popover.js";
import { createSidebar, updateSidebarList, updateSidebarBadge, openSidebar, closeSidebar } from "./ui/sidebar.js";
import { subscribeToAnnotations } from "./realtime.js";
import { handleDeepLink } from "./deep-link.js";

(function () {
  // Find our script tag — cannot use document.currentScript inside esbuild IIFE
  // as it becomes null after the script finishes parsing
  const scriptTag = document.querySelector("script[data-project]");
  if (!scriptTag) {
    console.error("MarkUX: could not find script tag with data-project attribute");
    return;
  }

  const projectId = scriptTag.getAttribute("data-project");
  if (!projectId) {
    console.error("MarkUX: missing data-project attribute");
    return;
  }

  // Supabase config — these are embedded at build time or read from data attributes
  const supabaseUrl =
    scriptTag.getAttribute("data-supabase-url") || "https://fcqywjpdjcsbcpnnfckw.supabase.co";
  const supabaseAnonKey =
    scriptTag.getAttribute("data-supabase-anon-key") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjcXl3anBkamNzYmNwbm5mY2t3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5OTE2MzUsImV4cCI6MjA5MDU2NzYzNX0.J4QYy5N_rPiRN0NF9TAQU119QOnDjIm8W73jUDpi3c8";
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/write-proxy`;

  const pageUrl = normalizeUrl(window.location.href);

  function init() {
    setApiKey(supabaseAnonKey);
    const supabase = initSupabase(supabaseUrl, supabaseAnonKey);

    // Create shadow DOM container
    const host = document.createElement("div");
    host.id = "markux-host";
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "closed" });

    // Inject styles
    const style = document.createElement("style");
    style.textContent = STYLES;
    shadow.appendChild(style);

    // Create UI elements
    const highlight = createHighlight();
    const overlay = createOverlay(handleOverlayClick);
    const fab = createFloatingButton(handleToggle);

    shadow.appendChild(highlight);
    shadow.appendChild(overlay);
    shadow.appendChild(fab);

    // Comment mode label
    const modeLabel = document.createElement("div");
    modeLabel.className = "markux-mode-label";
    modeLabel.textContent = "Comment Mode";
    shadow.appendChild(modeLabel);

    // Pin container (within shadow DOM)
    const pinContainer = document.createElement("div");
    shadow.appendChild(pinContainer);

    // Popover container
    const popoverContainer = document.createElement("div");
    shadow.appendChild(popoverContainer);

    // Sidebar drawer
    const sidebar = createSidebar(handleSidebarSelect, () => {});
    shadow.appendChild(sidebar);

    let cleanupHighlighting = null;
    let currentPopover = null;
    let pendingPin = null;
    let highlightedPin = null;

    function handleSidebarSelect(annotation, index) {
      // Clear previous highlight
      if (highlightedPin) {
        highlightedPin.classList.remove("highlighted");
        highlightedPin = null;
      }

      // Find the matching pin in the container
      const pins = pinContainer.querySelectorAll(".markux-pin");
      if (pins[index]) {
        highlightedPin = pins[index];
        highlightedPin.classList.add("highlighted");
        // Scroll into view if needed
        const rect = highlightedPin.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          const pinTop = parseFloat(highlightedPin.style.top);
          window.scrollTo({ top: pinTop - window.innerHeight / 2, behavior: "smooth" });
        }
      }
    }

    function handleToggle(isActive) {
      setAnnotationMode(isActive);
      modeLabel.classList.toggle("visible", isActive);
      if (isActive) {
        closeSidebar(sidebar);
        activateAnnotationMode(overlay);
        cleanupHighlighting = setupHighlighting(overlay, highlight, host);
      } else {
        deactivateAnnotationMode(overlay);
        if (cleanupHighlighting) {
          cleanupHighlighting();
          cleanupHighlighting = null;
        }
        closePopover();
      }
    }

    function closePopover() {
      if (currentPopover) {
        currentPopover.remove();
        currentPopover = null;
      }
      if (pendingPin) {
        pendingPin.remove();
        pendingPin = null;
      }
    }

    function handleOverlayClick(e) {
      if (!overlay.classList.contains("active")) return;
      closePopover();
      highlight.style.display = "none";

      const target = getElementUnderClick(overlay, e.clientX, e.clientY);
      if (!target || target === document.body || host.contains(target)) return;

      const selector = generateSelector(target);
      const { pinX, pinY } = calculatePinPosition(target, e.clientX, e.clientY);
      const pinNumber = getAnnotations().length + 1;

      // Create pin at click position (pending until comment is submitted)
      const pin = createPinMarker(pinNumber, e.clientX, e.clientY, () => {});
      pinContainer.appendChild(pin);
      pendingPin = pin;

      // Show comment form
      const popover = createCommentPopover(
        { x: e.clientX, y: e.clientY },
        async ({ name, email, comment }) => {
          try {
            // Capture screenshot
            const screenshotBase64 = await captureScreenshot();

            // Create annotation via Edge Function (without screenshot path initially)
            const annotation = await createAnnotation(
              edgeFunctionUrl,
              projectId,
              {
                page_url: pageUrl,
                author_name: name,
                author_email: email,
                comment,
                pin_x: pinX,
                pin_y: pinY,
                pin_selector: selector,
                viewport_width: window.innerWidth,
                viewport_height: window.innerHeight,
              },
            );

            // Upload screenshot using annotation ID per spec: {project_id}/{annotation_id}.png
            if (screenshotBase64) {
              const screenshotPath = `${projectId}/${annotation.id}.png`;
              await uploadScreenshot(
                edgeFunctionUrl,
                projectId,
                screenshotPath,
                screenshotBase64,
              ).then(() => {
                annotation.screenshot_path = screenshotPath;
              }).catch(() => {
                // Screenshot upload failure is non-critical
                console.warn("MarkUX: screenshot upload failed");
              });
            }

            pendingPin = null; // Pin is now committed
            annotation._replyCount = 0;
            addAnnotation(annotation);
            updateSidebarBadge(sidebar, getAnnotations().filter((a) => a.status === "open").length);
            updateSidebarList(sidebar, getAnnotations().filter((a) => a.status === "open"), sidebarCallbacks);

            // Replace pin with one that has initials
            const newPin = createPinMarker(pinNumber, parseFloat(pin.style.left), parseFloat(pin.style.top), () => showThread(annotation, newPin), name);
            pin.replaceWith(newPin);

            closePopover();
          } catch (err) {
            console.error("MarkUX: failed to create annotation", err);
            const btn = popover.querySelector('button[type="submit"]');
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Retry";
            }
          }
        },
        () => {
          closePopover();
        },
      );

      currentPopover = popover;
      popoverContainer.appendChild(popover);
    }

    async function showThread(annotation, pinEl) {
      closePopover();
      const rect = pinEl.getBoundingClientRect();

      // Fetch replies
      const { data: replies } = await supabase
        .from("replies")
        .select("*")
        .eq("annotation_id", annotation.id)
        .order("created_at", { ascending: true });

      const popover = createThreadPopover(
        annotation,
        replies || [],
        { x: rect.left, y: rect.bottom },
        async ({ name, email, body }) => {
          try {
            await createReply(edgeFunctionUrl, projectId, {
              annotation_id: annotation.id,
              author_name: name,
              author_email: email,
              body,
            });
            // Refresh thread
            showThread(annotation, pinEl);
          } catch (err) {
            console.error("MarkUX: failed to create reply", err);
          }
        },
        closePopover,
        (newStatus) => handleSidebarStatusChange(annotation, newStatus),
      );

      currentPopover = popover;
      popoverContainer.appendChild(popover);
    }

    async function loadRepliesForAnnotation(annotationId) {
      const { data } = await supabase
        .from("replies")
        .select("*")
        .eq("annotation_id", annotationId)
        .order("created_at", { ascending: true });
      return data || [];
    }

    async function handleSidebarReply(annotation, { name, email, body }) {
      await createReply(edgeFunctionUrl, projectId, {
        annotation_id: annotation.id,
        author_name: name,
        author_email: email,
        body,
      });
    }

    async function handleSidebarDelete(annotation) {
      await deleteAnnotation(edgeFunctionUrl, projectId, annotation.id, annotation.author_email);
      await loadAnnotations();
    }

    async function handleSidebarStatusChange(annotation, newStatus) {
      await updateAnnotationStatus(edgeFunctionUrl, projectId, annotation.id, newStatus);
      await loadAnnotations();
    }

    const sidebarCallbacks = { loadReplies: loadRepliesForAnnotation, onReply: handleSidebarReply, onDelete: handleSidebarDelete, onStatusChange: handleSidebarStatusChange };

    let deepLinkHandled = false;

    // Load existing annotations for this page
    async function loadAnnotations() {
      const { data, error } = await supabase
        .from("annotations")
        .select("*")
        .eq("project_id", projectId)
        .eq("page_url", pageUrl)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("MarkUX: failed to load annotations", error);
        return;
      }

      clearAnnotations();
      // Remove existing pins using DOM API
      while (pinContainer.firstChild) {
        pinContainer.removeChild(pinContainer.firstChild);
      }

      // Sort: open first, resolved at bottom
      const annotations = (data || []).sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === "open" ? -1 : 1;
      });
      if (annotations.length > 0) {
        const ids = annotations.map((a) => a.id);
        const { data: replyCounts } = await supabase
          .from("replies")
          .select("annotation_id")
          .in("annotation_id", ids);
        const countMap = {};
        (replyCounts || []).forEach((r) => {
          countMap[r.annotation_id] = (countMap[r.annotation_id] || 0) + 1;
        });
        annotations.forEach((a) => { a._replyCount = countMap[a.id] || 0; });
      }

      annotations.forEach((annotation, index) => {
        addAnnotation(annotation);

        let { x, y } = restorePinPosition(
          annotation.pin_selector,
          annotation.pin_x,
          annotation.pin_y,
        );

        // Clamp to viewport so pins don't go off-screen
        x = Math.max(20, Math.min(x, window.innerWidth - 20));
        y = Math.max(20, Math.min(y, window.innerHeight - 20));

        const pin = createPinMarker(index + 1, x, y, () =>
          showThread(annotation, pin),
          annotation.author_name,
          annotation.status,
        );
        pinContainer.appendChild(pin);
      });

      updateSidebarBadge(sidebar, annotations.filter((a) => a.status === "open").length);
      updateSidebarList(sidebar, annotations, sidebarCallbacks);

      if (!deepLinkHandled) {
        deepLinkHandled = true;
        handleDeepLink({
          hash: window.location.hash,
          sidebar,
          pinContainer,
          annotations,
          openSidebar,
          onSelect: handleSidebarSelect,
        });
      }
    }

    // Validate project exists and domain is allowed
    async function validateProject() {
      const { data: project, error } = await supabase
        .from("projects")
        .select("allowed_domains")
        .eq("id", projectId)
        .single();

      if (error || !project) {
        console.error("MarkUX: project not found");
        host.remove();
        return false;
      }

      const currentDomain = window.location.hostname;
      const allowed = project.allowed_domains.some(
        (d) => currentDomain === d || currentDomain.endsWith(`.${d}`),
      );

      if (!allowed) {
        console.error("MarkUX: domain not authorized for this project");
        host.remove();
        return false;
      }

      return true;
    }

    // Initialize
    validateProject().then((valid) => {
      if (!valid) return;
      loadAnnotations();
      subscribeToAnnotations(projectId, {
        onInsert: (ann) => {
          if (ann.page_url !== pageUrl) return;
          loadAnnotations();
        },
        onUpdate: () => loadAnnotations(),
        onDelete: () => loadAnnotations(),
      });
    });

    // Re-position pins on scroll/resize
    function repositionPins() {
      const annotations = getAnnotations();
      const pins = pinContainer.querySelectorAll(".markux-pin");
      annotations.forEach((ann, i) => {
        if (pins[i]) {
          const { x, y } = restorePinPosition(
            ann.pin_selector,
            ann.pin_x,
            ann.pin_y,
          );
          updatePinPosition(pins[i], x, y);
        }
      });
    }

    window.addEventListener("scroll", repositionPins, { passive: true });
    window.addEventListener("resize", repositionPins, { passive: true });
  }

  // Wait for DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

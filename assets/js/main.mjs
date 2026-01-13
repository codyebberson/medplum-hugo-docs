import mermaid from "mermaid";
import Swup from "swup";
import { initAnimatedCircles } from "./components/animated-circle.mjs";

mermaid.initialize({ startOnLoad: true });

function setAttribute(key, value) {
  document.body.dataset[key] = value;
}

function updateAttributes(newUrl) {
  const onDocsPage = newUrl.includes("/docs/");
  setAttribute("breadcrumbs", onDocsPage ? "visible" : "hidden");
  setAttribute("sidebar", onDocsPage ? "open" : "closed");
  setAttribute("toc", onDocsPage ? "visible" : "hidden");
  setAttribute("docFooter", onDocsPage ? "visible" : "hidden");
}

export const swup = new Swup({
  containers: ["#swup"],
  animationSelector: false,
  animateHistoryBrowsing: false,
});

swup.hooks.before("content:replace", (visit) => {
  updateAttributes(visit.to.url);
});

swup.hooks.on("content:replace", (visit) => {
  initAnimatedCircles();
});

updateAttributes(window.location.href);
initAnimatedCircles();

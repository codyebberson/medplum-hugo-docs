import Swup from "swup";
import { initAnimatedCircles } from "./components/animated-circle.mjs";

function setBodyDataAttribute(key, value) {
  document.body.dataset[key] = value;
}

export const swup = new Swup({
  containers: ["#swup"],
  animationSelector: false,
  animateHistoryBrowsing: false,
});

swup.hooks.before("content:replace", (visit) => {
  const onDocsPage = visit.to.url.includes("/docs/");
  setBodyDataAttribute("breadcrumbs", onDocsPage ? "visible" : "hidden");
  setBodyDataAttribute("sidebar", onDocsPage ? "open" : "closed");
  setBodyDataAttribute("toc", onDocsPage ? "visible" : "hidden");
});

swup.hooks.on("content:replace", (visit) => {
  initAnimatedCircles();
});

initAnimatedCircles();

document.getElementById("toggle-left-nav").addEventListener("change", (e) => {
  setBodyDataAttribute("sidebar", e.target.checked ? "open" : "closed");
});

document
  .getElementById("toggle-breadcrumbs")
  .addEventListener("change", (e) => {
    setBodyDataAttribute(
      "breadcrumbs",
      e.target.checked ? "visible" : "hidden"
    );
  });

document.getElementById("toggle-toc").addEventListener("change", (e) => {
  setBodyDataAttribute("toc", e.target.checked ? "visible" : "hidden");
});

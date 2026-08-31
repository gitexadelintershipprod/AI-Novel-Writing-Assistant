import { useLayoutEffect, type PropsWithChildren } from "react";
import { containsHan, translateUiText } from "@/i18n/legacyUi";

const TRANSLATABLE_ATTRIBUTES = ["aria-label", "alt", "placeholder", "title"] as const;
const PRESERVED_CONTENT_SELECTOR = [
  "code",
  "pre",
  "script",
  "style",
  "textarea",
  "[contenteditable='true']",
  "[data-preserve-language]",
  "[data-novel-content]",
  ".ProseMirror",
  ".chapter-content",
  ".novel-content",
].join(",");

function shouldPreserve(element: Element | null): boolean {
  return Boolean(element?.closest(PRESERVED_CONTENT_SELECTOR));
}

function translateTextNode(node: Text): void {
  if (!node.nodeValue || !containsHan(node.nodeValue) || shouldPreserve(node.parentElement)) return;
  const translated = translateUiText(node.nodeValue);
  if (translated !== node.nodeValue) node.nodeValue = translated;
}

function translateElement(element: Element): void {
  if (shouldPreserve(element)) return;
  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    const value = element.getAttribute(attribute);
    if (!value || !containsHan(value)) continue;
    const translated = translateUiText(value);
    if (translated !== value) element.setAttribute(attribute, translated);
  }
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) translateTextNode(child as Text);
    else if (child.nodeType === Node.ELEMENT_NODE) translateElement(child as Element);
  }
}

export default function EnglishUiBoundary({ children }: PropsWithChildren) {
  useLayoutEffect(() => {
    document.documentElement.lang = "en";
    translateElement(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text);
          continue;
        }
        if (mutation.type === "attributes") {
          translateElement(mutation.target as Element);
          continue;
        }
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text);
          else if (node.nodeType === Node.ELEMENT_NODE) translateElement(node as Element);
        }
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  return children;
}

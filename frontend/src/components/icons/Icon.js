import React from "react";

const Icon = ({ name, size = 18, className = "", ...props }) => {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    className,
    ...props,
  };

  switch (name) {
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      );
    case "paper-plane":
      return (
        <svg {...common}>
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      );
    case "hourglass":
      return (
        <svg {...common}>
          <path d="M6 2h12" />
          <path d="M6 22h12" />
          <path d="M7 7h10v1l-3 3 3 3v1H7v-1l3-3-3-3V7z" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case "warning":
      return (
        <svg {...common}>
          <path d="M10.29 3.86L1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.71 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "error":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      );
    case "idea":
      return (
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 14a3 3 0 1 1 4 0" />
          <path d="M12 2v2" />
          <path d="M6.2 6.2l1.4 1.4" />
          <path d="M17.4 6.2l-1.4 1.4" />
        </svg>
      );
    case "wave":
      return (
        <svg {...common}>
          <path d="M2 12c2-4 6-8 12-8s10 4 12 8" />
          <path d="M2 12c2 4 6 8 12 8s10-4 12-8" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="10" rx="2" />
          <path d="M3 8l9 5 9-5" />
        </svg>
      );
    case "note":
      return (
        <svg {...common}>
          <path d="M7 7h10v10H7z" />
          <path d="M7 11h10" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v2" />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 7h.01M9 11h.01M9 15h.01M13 7h.01M13 11h.01M13 15h.01" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M20.59 13.41L13 20l-9-9 7.59-7.59a2 2 0 0 1 2.82 0l6.18 6.18a2 2 0 0 1 0 2.82z" />
          <circle cx="7.5" cy="7.5" r="1.5" />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path d="M10 14a5 5 0 0 0 7.07 0l1.41-1.41" />
          <path d="M14 10a5 5 0 0 0-7.07 0L5.52 11.41" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M12 2l2.6 6.9L22 10l-5 3.6L18 22l-6-3.8L6 22l1-8.4L2 10l7.4-1.1L12 2z" />
        </svg>
      );
    case "robot":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="11" rx="2" />
          <path d="M7 7V5h10v2" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="15" cy="12" r="1" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    default:
      return null;
  }
};

export default Icon;

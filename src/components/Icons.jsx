const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function HomeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function CameraIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function FileTextIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M9 12.5h6M9 16h6" />
    </svg>
  );
}

export function SettingsIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.6a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87A1.7 1.7 0 0 0 3 12.44h-.1a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V1.4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.06A1.7 1.7 0 0 0 21 9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.56 1.04Z" />
    </svg>
  );
}

export function ArrowLeftIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

export function LogoutIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function SearchIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function PlusIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

export function ArrowDownLeftIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M17 7 7 17M16 17H7V8" />
    </svg>
  );
}

export function ArrowUpRightIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

export function BankIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7" />
      <path d="M3 20h18" />
    </svg>
  );
}

export function WalletIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7a2 2 0 0 1 2-2h11v4" />
      <path d="M4 7v11a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H6a2 2 0 0 1-2-2Z" />
      <circle cx="16" cy="14.5" r="1.2" />
    </svg>
  );
}

export function TransferIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" />
    </svg>
  );
}

export function DownloadIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v11M7 10.5 12 15.5 17 10.5" />
      <path d="M5 20h14" />
    </svg>
  );
}

export function EditIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 7.5 3 3" />
    </svg>
  );
}

export function BookIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 6.5C10 5 7.5 4.5 4 4.5v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2Z" />
      <path d="M12 6.5v14" />
    </svg>
  );
}

export function RotateIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M20 11a8 8 0 1 0-2.34 5.66" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

export function MinusIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14" />
    </svg>
  );
}

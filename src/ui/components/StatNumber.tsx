interface StatNumberProps {
  label: string;
  value: number | null;
  align?: "left" | "right" | "center";
}

const ALIGN = {
  left: "items-start text-left",
  right: "items-end text-right",
  center: "items-center text-center",
};

/** A large serif figure with a mono micro-label. `null` renders a placeholder while loading. */
export function StatNumber({ label, value, align = "left" }: StatNumberProps) {
  return (
    <div className={`flex flex-col gap-1 ${ALIGN[align]}`}>
      <dt className="micro-label order-2 text-text-subtle">{label}</dt>
      <dd className="order-1 font-serif text-[44px] leading-none text-text tabular-nums">
        {value ?? "—"}
      </dd>
    </div>
  );
}

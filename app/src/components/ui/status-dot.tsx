interface StatusDotProps {
  active: boolean;
}

export function StatusDot({ active }: StatusDotProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: active ? "#3dba6e" : "#e05252" }}
      />
      <span
        className="text-[10px] font-medium leading-none"
        style={{ color: active ? "#3dba6e" : "#e05252" }}
      >
        {active ? "Active" : "Inactive"}
      </span>
    </div>
  );
}

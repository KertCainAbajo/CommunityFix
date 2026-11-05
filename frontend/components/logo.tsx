export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-10 flex-none place-items-center rounded-xl bg-white p-1 shadow-[0_0_0_1px_rgb(11_23_41/6%),0_6px_16px_-6px_rgb(29_78_216/35%)]">
        <img src="/logo-mark.png" alt="" className="size-full object-contain" />
      </span>
      <span className="grid leading-none">
        <span className="font-heading text-lg font-extrabold tracking-tight text-foreground">
          Community<span className="text-brand-green">Fix</span>
        </span>
        <span className="mt-1 font-mono text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">Civic tracker</span>
      </span>
    </span>
  );
}

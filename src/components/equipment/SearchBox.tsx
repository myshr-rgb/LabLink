import { button, control } from "@/components/ui/workflow-ui";

export function SearchBox({
  value = "",
}: {
  value?: string;
}): React.JSX.Element {
  return (
    <form action="/equipment" role="search" className="grid gap-2">
      <label htmlFor="equipment-search" className="font-medium">
        Search equipment
      </label>
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        <input
          id="equipment-search"
          type="search"
          name="q"
          defaultValue={value}
          maxLength={120}
          data-testid="search-input"
          placeholder="Try FPGA, oscilloscope, or Bluetooth"
          className={control}
        />
        <button className={button}>Search</button>
      </div>
    </form>
  );
}

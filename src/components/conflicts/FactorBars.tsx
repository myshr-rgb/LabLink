import { FACTOR_KEYS, type Factors } from "@/lib/allocation/types";
const labels = {
  deadline: "Deadline",
  priority: "Faculty priority",
  fairShare: "Fair share",
  waiting: "Wait time",
  reliability: "Reliability",
};
export function FactorBars({
  factors,
}: {
  factors: Factors;
}): React.JSX.Element {
  return (
    <ul className="grid min-w-36 gap-1 text-xs">
      {FACTOR_KEYS.map((key) => (
        <li
          key={key}
          className="grid grid-cols-[1fr_auto] items-center gap-x-2"
        >
          <span>{labels[key]}</span>
          <span>{Math.round(factors[key] * 100)}%</span>
          <meter
            className="col-span-2 h-2 w-full"
            aria-label={labels[key]}
            min={0}
            max={1}
            value={factors[key]}
          />
        </li>
      ))}
    </ul>
  );
}

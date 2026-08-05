"use client";

import styles from "./ui.module.scss";

interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  label: string;
  description: string;
}

export function SegmentedControl({ options, value, onChange, label, description }: SegmentedControlProps) {
  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        <span className={styles.description}>{description}</span>
      </div>
      <div className={styles.segmentedControl}>
        {options.map((opt) => (
          <button
            key={opt}
            className={`${styles.segment} ${value === opt ? styles.active : ""}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

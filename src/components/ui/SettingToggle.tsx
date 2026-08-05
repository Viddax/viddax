"use client";

import styles from "./ui.module.scss";

interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

export function SettingToggle({ label, description, checked, onChange }: SettingToggleProps) {
  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        <span className={styles.description}>{description}</span>
      </div>
      <div 
        className={`${styles.toggle} ${checked ? styles.active : ""}`} 
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      >
        <div className={styles.knob} />
      </div>
    </div>
  );
}

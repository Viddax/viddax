"use client";

import React from "react";
import styles from "./ui.module.scss";

interface SettingInputProps {
  label: string;
  description: string;
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
}

export function SettingInput({ label, description, value, placeholder, onChange }: SettingInputProps) {
  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        <span className={styles.description}>{description}</span>
      </div>
      <div className={styles.inputContainer}>
        <input 
          type="text" 
          className={styles.input}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

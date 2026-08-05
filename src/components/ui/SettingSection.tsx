"use client";

import React from "react";
import styles from "./ui.module.scss";

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.icon}>🔗</span>
        <h2>{title}</h2>
      </div>
      <div className={styles.sectionBody}>
        {children}
      </div>
    </section>
  );
}

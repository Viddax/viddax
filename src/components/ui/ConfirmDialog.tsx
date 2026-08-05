"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ConfirmDialog.module.scss";

interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ isOpen, message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlay}>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCancel}
          />
          <motion.div
            className={styles.dialog}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className={styles.content}>
              <p>{message}</p>
            </div>
            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={onCancel}>cancel</button>
              <button className={styles.confirmBtn} onClick={onConfirm}>confirm</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

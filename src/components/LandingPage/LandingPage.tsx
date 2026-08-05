import React from 'react';
import { motion } from 'framer-motion';
import { Download, Monitor, Zap, Settings } from 'lucide-react';
import styles from './LandingPage.module.scss';

export function LandingPage() {
  return (
    <div className={styles.container}>
      {/* Lava Lamp Background Blobs */}
      <div className={styles.blobContainer}>
        <motion.div 
          className={`${styles.blob} ${styles.blob1}`}
          animate={{ 
            x: [0, 100, 0, -100, 0],
            y: [0, 50, 100, 50, 0],
            scale: [1, 1.2, 1, 0.8, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className={`${styles.blob} ${styles.blob2}`}
          animate={{ 
            x: [0, -100, 0, 100, 0],
            y: [0, -50, -100, -50, 0],
            scale: [1, 0.8, 1, 1.2, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div 
          className={`${styles.blob} ${styles.blob3}`}
          animate={{ 
            x: [100, 0, -100, 0, 100],
            y: [100, 50, 0, 50, 100],
            scale: [0.8, 1, 1.2, 1, 0.8]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        />
      </div>

      <div className={styles.content}>
        <div className={styles.hero}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
            className={styles.header}
          >
            <div className={styles.logo}>viddax.</div>
            <h1 className={styles.title}>The media downloader you&apos;ve been waiting for.</h1>
            <p className={styles.subtitle}>
              Blazing fast. Butter smooth. Up to 8K resolution.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
            className={styles.ctaWrapper}
          >
            <a href="https://github.com/NerdBlud/Viddax/releases/latest" className={styles.downloadButton}>
              <Download size={18} strokeWidth={2.5} />
              <span>Download for Windows</span>
            </a>
            <p className={styles.versionInfo}>Requires Windows 10/11 • 64-bit</p>
          </motion.div>
        </div>

        <motion.div 
          className={styles.features}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.5 }}
        >
          <div className={styles.featureCard}>
            <Monitor className={styles.featureIcon} size={24} />
            <h3>Cross-Platform</h3>
            <p>Download from YouTube, TikTok, Reddit, Instagram, Twitter, and over 1,000+ supported websites seamlessly.</p>
          </div>
          <div className={styles.featureCard}>
            <Zap className={styles.featureIcon} size={24} />
            <h3>Lossless Engine</h3>
            <p>Automatically merges 8K video streams and extracts crisp 320kbps audio without annoying pop-ups.</p>
          </div>
          <div className={styles.featureCard}>
            <Settings className={styles.featureIcon} size={24} />
            <h3>Power User Settings</h3>
            <p>Built-in proxy routing, SponsorBlock API support, subtitle embedding, and metadata manipulation.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

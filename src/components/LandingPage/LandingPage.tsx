import React from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import styles from './LandingPage.module.scss';

export function LandingPage() {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={styles.header}
        >
          <div className={styles.logo}>Viddax</div>
          <h1 className={styles.title}>The Ultimate Media Downloader</h1>
          <p className={styles.subtitle}>
            Download video and audio from any platform in up to 8K resolution. 
            Completely ad-free, butter smooth, and lightning fast.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={styles.ctaWrapper}
        >
          <a href="https://github.com/NerdBlud/Viddax/releases/latest" className={styles.downloadButton}>
            <Download size={24} />
            <span>Download for Windows</span>
          </a>
          <p className={styles.versionInfo}>Requires Windows 10/11 • 64-bit</p>
        </motion.div>
      </div>

      <div className={styles.features}>
        <div className={styles.featureCard}>
          <h3>Cross-Platform</h3>
          <p>YouTube, TikTok, Reddit, Instagram, Twitter, and 1,000+ more.</p>
        </div>
        <div className={styles.featureCard}>
          <h3>Highest Quality</h3>
          <p>Lossless 8K video merging and 320kbps audio extraction.</p>
        </div>
        <div className={styles.featureCard}>
          <h3>Power User Features</h3>
          <p>SponsorBlock integration, proxy support, and subtitle embedding.</p>
        </div>
      </div>
    </div>
  );
}

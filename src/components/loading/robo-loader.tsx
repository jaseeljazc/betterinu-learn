"use client"

import { cn } from "@/lib/utils"

import styles from "./robo-loader.module.css"

const VIEWBOX = "0 0 68 58"

type RoboLoaderProps = {
  className?: string
  /** Accessible name for screen readers */
  label?: string
  /** Visual width; height follows aspect ratio of the artwork */
  size?: "xs" | "sm" | "md" | "lg"
  /** Optional line under the bot (e.g. “Loading…”) */
  caption?: string
  /** Center in a flexible full-area block (e.g. route `loading.tsx`) */
  fill?: boolean
}

const sizeClass = {
  xs: "w-5",
  sm: "w-12",
  md: "w-16",
  lg: "w-24",
} as const


/**
 * Loading indicator using `public/robo.svg` artwork with a light mechanical bob,
 * synced “visor” blink, and antenna pulse.
 */
export function RoboLoader({
  className,
  label = "Loading",
  size = "md",
  caption,
  fill = false,
}: RoboLoaderProps) {
  const svg = (
    <svg
      className={cn(styles.svg, sizeClass[size], "drop-shadow-md")}
      viewBox={VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
    >
      <g>
        <path
          className={styles.fillShell}
          d="M28.2026 11.6007C16.5046 13.606 10.0985 21.2097 8.35774 24.7609V15.5696C8.14887 14.5252 7.31327 14.5252 7.10437 14.5252C6.2688 14.5252 6.05991 15.2215 6.05991 15.5696V25.8054H4.80655C4.13809 25.8054 3.69247 26.641 3.55321 27.0587C3.48358 32.1418 3.3861 42.6421 3.55321 43.9791C3.72032 45.316 4.59767 45.7895 5.01546 45.8591H7.31328C7.98174 48.3658 11.9089 52.3348 13.789 54.0059C17.2984 56.6797 30.57 57.2089 36.7672 57.1393C44.9558 57.1393 51.4593 55.0504 53.6875 54.0059C57.6982 51.6663 59.815 47.5999 60.372 45.8591C61.2772 45.9287 63.1712 45.9844 63.5054 45.6502C63.8397 45.316 63.9232 44.5361 63.9232 44.188V27.2676L63.5054 26.0143H61.4165V15.7785C61.4165 14.6087 60.7202 14.3163 60.372 14.3163C59.5365 14.3163 59.3276 15.2911 59.3276 15.7785V24.7609C56.1524 17.0737 44.7747 12.7844 39.4828 11.6007L38.4383 10.7651H34.6782V5.125H33.0071V10.7651H29.247L28.2026 11.6007Z"
        />
        <path
          className={styles.strokeFace}
          d="M28.6194 20.3735C16.9214 20.2064 11.6295 26.4314 10.4458 29.5648C9.26204 32.6982 9.4013 35.4137 9.4013 35.4137C9.06707 39.5916 10.3761 42.725 11.0724 43.7694C13.7463 49.7856 23.4668 51.2896 27.9928 51.2896H41.7797C50.1354 51.1225 54.8703 46.7636 56.1933 44.605C58.8671 41.4298 58.2822 34.23 57.6555 31.027C55.483 23.3397 47.2805 20.7216 43.4508 20.3735C39.6211 20.0253 28.6194 20.3735 28.6194 20.3735Z"
          strokeWidth="0.855883"
        />
        <path
          className={styles.fillFace}
          d="M29.1631 21.5654C18.0551 21.4104 13.03 27.1859 11.906 30.093C10.782 33.0001 10.9142 35.5196 10.9142 35.5196C10.5969 39.3958 11.8399 42.3029 12.5011 43.272C15.04 48.8537 24.2703 50.2491 28.568 50.2491H41.6596C49.5938 50.094 54.0899 46.0499 55.3462 44.0472C57.8852 41.1013 57.3298 34.4214 56.7347 31.4496C54.6718 24.3175 46.883 21.8884 43.2464 21.5654C39.6099 21.2424 29.1631 21.5654 29.1631 21.5654Z"
        />
        <path
          className={styles.fillShell}
          d="M0 34.9906C0 31.3143 1.94959 28.5849 2.92438 27.6797L2.7155 43.346C0.5431 41.1736 0 36.8706 0 34.9906Z"
        />
        <path
          className={styles.fillShell}
          d="M67.2656 34.9906C67.2656 31.3143 65.316 28.5849 64.3412 27.6797L64.5501 43.346C66.7225 41.1736 67.2656 36.8706 67.2656 34.9906Z"
        />
        <circle
          className={cn(styles.fillEye, styles.eye)}
          cx="25.0681"
          cy="35.6189"
          r="4.59546"
        />
        <circle
          className={cn(styles.fillEye, styles.eye, styles.eyeDelayed)}
          cx="42.615"
          cy="35.6189"
          r="4.59546"
        />
        <circle
          className={cn(styles.fillShell, styles.antenna)}
          cx="33.8424"
          cy="3.03376"
          r="2.92438"
          stroke="currentColor"
          strokeWidth="0.213971"
        />
      </g>
    </svg>
  )

  const inner = (
    <>
      {svg}
      {caption ? (
        <p className="text-muted-foreground max-w-xs text-center text-xs">
          {caption}
        </p>
      ) : null}
    </>
  )

  if (fill) {
    return (
      <div
        className={cn(
          "flex min-h-[min(60vh,28rem)] w-full flex-1 flex-col items-center justify-center gap-3 p-6",
          className
        )}
        role="status"
        aria-busy="true"
        aria-label={label}
      >
        <span className="sr-only">{label}</span>
        {inner}
      </div>
    )
  }

  return (
    <div
      className={cn("inline-flex flex-col items-center gap-2", className)}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      {inner}
    </div>
  )
}

export default RoboLoader
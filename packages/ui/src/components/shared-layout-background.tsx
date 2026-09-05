"use client";

// Adapted from beui.dev/components/motion/shared-layout-bg at upstream commit
// 04d6f76e9e67e35cded996b1b8d08a5ddcebc13a (MIT). See THIRD_PARTY_NOTICES.md.
// Registry payload SHA-256: b61ea3ac09650b2049d0a9edf0aba7fa1ab4a53c2aacdf1998b1346e11b69b92.

import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  Children,
  cloneElement,
  forwardRef,
  type FocusEvent,
  type HTMLAttributes,
  isValidElement,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  useId,
  useState,
} from "react";
import { SPRING_LAYOUT } from "../lib/motion";
import { cn } from "../lib/utils";

export interface SharedLayoutBackgroundProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children: ReactNode;
  /** Semantic container used for the interactive items. */
  as?: "div" | "ul";
  /** Class applied to the transient hover/focus pill. */
  pillClassName?: string;
  /** Horizontal pill inset relative to each item, in pixels. */
  inset?: number;
  /** Positioning override for the pill wrapper inside each item. */
  pillContainerClassName?: string;
}

const variants: Variants = {
  initial: { opacity: 0, filter: "blur(6px)" },
  animate: { opacity: 1, filter: "blur(0px)" },
  exit: { opacity: 0, filter: "blur(6px)" },
};

type InteractiveChildProps = {
  className?: string;
  children?: ReactNode;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
};

export const SharedLayoutBackground = forwardRef<HTMLElement, SharedLayoutBackgroundProps>(
  function SharedLayoutBackground(
    {
      children,
      as = "div",
      className,
      onPointerLeave,
      pillClassName,
      pillContainerClassName,
      inset = 20,
      ...props
    },
    forwardedRef,
  ) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const uid = useId();
    const reduceMotion = useReducedMotion();

    const renderedChildren = Children.toArray(children)
      .filter(isValidElement)
      .map((child, index) => {
        const element = child as ReactElement<InteractiveChildProps>;
        const childKey = element.key ? String(element.key) : `item-${index}`;

        return cloneElement(
          element,
          {
            key: childKey,
            className: cn("relative", element.props.className),
            onBlur: (event) => {
              element.props.onBlur?.(event);
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setActiveId(null);
              }
            },
            onFocus: (event) => {
              element.props.onFocus?.(event);
              setActiveId(childKey);
            },
            onPointerEnter: (event) => {
              element.props.onPointerEnter?.(event);
              if (event.pointerType !== "mouse") return;
              setActiveId(childKey);
            },
          },
          <>
            <AnimatePresence>
              {activeId !== null ? (
                reduceMotion ? (
                  <div
                    className={cn("pointer-events-none absolute inset-y-0", pillContainerClassName)}
                    style={{ left: -inset, right: -inset }}
                  >
                    {activeId === childKey ? (
                      <div
                        data-slot="shared-layout-background-pill"
                        data-reduced-motion="true"
                        className={cn(
                          "pointer-events-none h-full w-full rounded-md bg-accent",
                          pillClassName,
                        )}
                      />
                    ) : null}
                  </div>
                ) : (
                  <motion.div
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className={cn("pointer-events-none absolute inset-y-0", pillContainerClassName)}
                    style={{ left: -inset, right: -inset }}
                  >
                    {activeId === childKey ? (
                      <motion.div
                        data-slot="shared-layout-background-pill"
                        data-reduced-motion="false"
                        layoutId={`shared-bg-${uid}`}
                        transition={SPRING_LAYOUT}
                        className={cn(
                          "pointer-events-none h-full w-full rounded-md bg-accent",
                          pillClassName,
                        )}
                      />
                    ) : null}
                  </motion.div>
                )
              ) : null}
            </AnimatePresence>
            <div className="relative z-10">{element.props.children}</div>
          </>,
        );
      });

    const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(document.activeElement)) {
        setActiveId(null);
      }
      onPointerLeave?.(event);
    };

    return as === "ul" ? (
      <motion.ul
        {...(props as HTMLMotionProps<"ul">)}
        ref={forwardedRef as Ref<HTMLUListElement>}
        layoutRoot
        onPointerLeave={handlePointerLeave}
        className={cn("flex w-full flex-col", className)}
      >
        {renderedChildren}
      </motion.ul>
    ) : (
      <motion.div
        {...(props as HTMLMotionProps<"div">)}
        ref={forwardedRef as Ref<HTMLDivElement>}
        layoutRoot
        onPointerLeave={handlePointerLeave}
        className={cn("flex w-full flex-col", className)}
      >
        {renderedChildren}
      </motion.div>
    );
  },
);

SharedLayoutBackground.displayName = "SharedLayoutBackground";

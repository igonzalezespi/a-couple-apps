import { Text as CoreText, styled, View, type GetProps } from '@tamagui/core';

/** Vertical flex container. */
export const YStack = styled(View, {
  name: 'YStack',
  flexDirection: 'column'
});

/** Horizontal flex container. */
export const XStack = styled(View, {
  name: 'XStack',
  flexDirection: 'row'
});

/** Themed text primitive. */
export const Text = styled(CoreText, {
  name: 'Text',
  color: '$color',
  fontFamily: '$body',
  fontSize: '$3'
});

/** Full-bleed screen surface. */
export const Screen = styled(YStack, {
  name: 'Screen',
  flex: 1,
  backgroundColor: '$background',
  padding: '$4',
  gap: '$3'
});

/** Elevated content surface. */
export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$background',
  borderColor: '$borderColor',
  borderWidth: 1,
  borderRadius: '$4',
  padding: '$4',
  gap: '$2'
});

const ButtonFrame = styled(XStack, {
  name: 'Button',
  cursor: 'pointer',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$2',
  paddingHorizontal: '$4',
  paddingVertical: '$3',
  borderWidth: 0,
  borderRadius: '$3',
  backgroundColor: '$primary',
  pressStyle: { opacity: 0.85 },
  hoverStyle: { opacity: 0.95 },
  variants: {
    tone: {
      primary: { backgroundColor: '$primary' },
      neutral: { backgroundColor: '$backgroundHover' }
    },
    disabled: {
      true: { opacity: 0.5, pointerEvents: 'none' }
    }
  } as const,
  defaultVariants: {
    tone: 'primary'
  }
});

export type ButtonProps = GetProps<typeof ButtonFrame>;

/**
 * Accessible, pressable action. Renders a real `<button>` on web (keyboard,
 * focus and role for free) and an accessibility-roled View on native. Compose a
 * `<Text>` child for the label; pass `onPress` at the call site.
 */
export function Button(props: ButtonProps) {
  return <ButtonFrame role="button" {...props} />;
}

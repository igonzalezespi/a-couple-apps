import { Text as CoreText, styled, View } from '@tamagui/core';

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

/** Pressable action surface. Compose a `<Text>` child for the label. */
export const Button = styled(XStack, {
  name: 'Button',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: '$4',
  paddingVertical: '$3',
  borderRadius: '$3',
  backgroundColor: '$primary',
  variants: {
    tone: {
      primary: { backgroundColor: '$primary' },
      neutral: { backgroundColor: '$backgroundHover' }
    }
  } as const,
  defaultVariants: {
    tone: 'primary'
  }
});

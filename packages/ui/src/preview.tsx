import { Button, Card, Screen, Text, XStack, YStack } from './components';

/**
 * A lightweight visual catalogue of the design system, mounted inside an app
 * screen (or a future Storybook) to eyeball cross-platform token parity.
 */
export function Preview() {
  return (
    <Screen>
      <Text fontSize="$7" fontWeight="700">
        A Couple Apps — UI
      </Text>

      <Card>
        <Text fontWeight="600">Card surface</Text>
        <Text color="$colorMuted">Tokens resolve identically on web + native.</Text>
        <XStack gap="$2">
          <Button>
            <Text color="$onPrimary">Primary</Text>
          </Button>
          <Button tone="neutral">
            <Text>Neutral</Text>
          </Button>
        </XStack>
      </Card>

      <XStack gap="$2">
        <Swatch label="primary" token="$primary" />
        <Swatch label="accent" token="$accent" />
        <Swatch label="border" token="$borderColor" />
      </XStack>
    </Screen>
  );
}

function Swatch({ label, token }: { label: string; token: string }) {
  return (
    <YStack gap="$1" alignItems="center">
      <YStack width={48} height={48} borderRadius="$3" backgroundColor={token} />
      <Text fontSize="$1" color="$colorMuted">
        {label}
      </Text>
    </YStack>
  );
}

// A small exercise thumbnail that opens a full-screen zoomed view on tap, via the shared
// useImageLightboxStore. Use this instead of a bare <Image> for any exercise/bundle thumbnail
// outside the Exercises tab's own detail screen (which already shows the image at full size).
import { Image, Pressable } from "react-native";
import type { ImageStyle, StyleProp } from "react-native";
import { useImageLightboxStore } from "../core/ui/imageLightboxStore";

interface ZoomableThumbnailProps {
  uri: string;
  alt?: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: "cover" | "contain";
}

export function ZoomableThumbnail({ uri, alt = "", style, resizeMode = "cover" }: ZoomableThumbnailProps) {
  const open = useImageLightboxStore((s) => s.open);
  return (
    // `style` is applied to both the Pressable and the Image: the caller's width/height (e.g.
    // "100%" in a grid card) needs to land on the outer element for layout to size correctly,
    // while View happily ignores Image-only properties like resizeMode.
    <Pressable onPress={() => open(uri, alt)} hitSlop={6} style={style}>
      <Image source={{ uri }} style={style} resizeMode={resizeMode} />
    </Pressable>
  );
}

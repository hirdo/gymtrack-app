// RN equivalent of gymtrack-web's <app-image-lightbox>: a full-screen modal that shows
// whatever exercise image was last opened via useImageLightboxStore. Mounted once in the root
// layout so any screen can zoom a thumbnail by calling the store's open() — see ZoomableThumbnail.
import { Image, Modal, Pressable, Text } from "react-native";
import { useImageLightboxStore } from "../core/ui/imageLightboxStore";
import { colors, fonts } from "../core/theme/tokens";

export function ImageLightbox() {
  const activeImage = useImageLightboxStore((s) => s.activeImage);
  const close = useImageLightboxStore((s) => s.close);

  return (
    <Modal visible={!!activeImage} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        style={{ flex: 1, backgroundColor: "#000000e6", alignItems: "center", justifyContent: "center", padding: 24 }}
        onPress={close}
      >
        {activeImage ? (
          <>
            <Image
              source={{ uri: activeImage.url }}
              style={{ width: "100%", aspectRatio: 1, borderRadius: 12 }}
              resizeMode="contain"
            />
            {activeImage.alt ? (
              <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14, marginTop: 16, textAlign: "center" }}>
                {activeImage.alt}
              </Text>
            ) : null}
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, marginTop: 10 }}>Tap anywhere to close</Text>
          </>
        ) : null}
      </Pressable>
    </Modal>
  );
}

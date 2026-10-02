import { Animated, Modal, type ModalProps } from 'react-native';
import { useModalMotion } from './use-modal-motion';

export function MotionModal({
  visible = false,
  children,
  onRequestClose,
  ...props
}: Omit<ModalProps, 'onRequestClose'> & { onRequestClose?: () => void }) {
  const transition = useModalMotion(visible, () => onRequestClose?.());
  return (
    <Modal {...props} visible={transition.present} animationType="none" onRequestClose={onRequestClose}>
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[{ flex: 1 }, transition.overlay, transition.sheet]}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}

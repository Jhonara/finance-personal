import { Image } from 'react-native';

import homeKobo from '../../assets/brand/kobo-home.png';
import homeMark from '../../assets/brand/mark-home.png';

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <Image accessible={false} source={homeMark} resizeMode="contain" style={{ width: size, height: size }} />
  );
}

export function BrandMascot({ size = 72 }: { size?: number }) {
  return (
    <Image accessible={false} source={homeKobo} resizeMode="contain" style={{ width: size, height: size }} />
  );
}

const Babel = require('@babel/standalone');

const defaultTsx = `
import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const DURATION = 600;
export const FPS = 60;
export const WIDTH = 3840;
export const HEIGHT = 2160;

export const MyAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;
  const scale = spring({ frame, fps, config: { damping: 12, mass: 0.5 }, from: 0.85, to: 1.0 });
  const opacity = interpolate(progress, [0, 0.15, 0.85, 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ width: '100%', height: '100%', backgroundColor: '#060608' }}>
      <div style={{ opacity, transform: 'scale(' + scale + ')', color: '#fff', fontSize: '64px' }}>
        Live Remotion Animation Frame {frame}
      </div>
    </AbsoluteFill>
  );
};
export default MyAnimation;
`;

const res = Babel.transform(defaultTsx, {
  presets: [['react', { runtime: 'classic' }], 'typescript'],
  plugins: ['transform-modules-commonjs']
});
console.log('TRANSPILED OK! Length:', res.code.length);

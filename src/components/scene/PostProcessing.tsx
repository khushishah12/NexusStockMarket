'use client';

import React from 'react';
import { EffectComposer, Bloom, Vignette, ChromaticAberration, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useMarketStore } from '../../store/useMarketStore';

export default function PostProcessing() {
  const { bullReacting, bearReacting, patternHighlight } = useMarketStore();
  const reactive = bullReacting || bearReacting || patternHighlight;

  return (
    <EffectComposer>
      <Bloom
        intensity={reactive ? 1.65 : 1.35}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.85}
        mipmapBlur
      />
      <ChromaticAberration offset={reactive ? [0.002, 0.0012] : [0.0006, 0.0004]} />
      <Vignette eskil={false} offset={0.28} darkness={0.75} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

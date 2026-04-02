'use client';

import React from 'react';
import { createComponent } from '@lit/react';
import { MdCircularProgress } from '@material/web/progress/circular-progress.js';

const CircularProgress = createComponent({
  tagName: 'md-circular-progress',
  elementClass: MdCircularProgress,
  react: React,
});

export default CircularProgress;

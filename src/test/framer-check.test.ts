import { motion } from 'framer-motion';
import { describe, it, expect } from 'vitest';

describe('Framer Motion', () => {
  it('has create method', () => {
    console.log('motion keys:', Object.keys(motion));
    expect(motion.create).toBeDefined();
  });
});

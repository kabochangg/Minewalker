import Phaser from 'phaser';
import './styles.css';
import { GameScene } from './game/GameScene';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Missing #app element');
}

const gameWrap = document.createElement('div');
gameWrap.id = 'game-wrap';
app.appendChild(gameWrap);

const getSize = () => {
  const w = Math.min(window.innerWidth - 12, 440);
  const h = Math.min(window.innerHeight - 12, 920);
  return {
    width: Math.max(320, Math.floor(w)),
    height: Math.max(560, Math.floor(h))
  };
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-wrap',
  ...getSize(),
  backgroundColor: '#0b1020',
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [GameScene]
});

window.addEventListener('resize', () => {
  const next = getSize();
  game.scale.resize(next.width, next.height);
});

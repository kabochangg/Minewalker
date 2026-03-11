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

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-wrap',
  width: Math.min(window.innerWidth, 430),
  height: window.innerHeight,
  backgroundColor: '#11131a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [GameScene]
});

window.addEventListener('resize', () => {
  game.scale.resize(Math.min(window.innerWidth, 430), window.innerHeight);
});

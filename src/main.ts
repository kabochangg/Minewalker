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
  width: 420,
  height: 800,
  backgroundColor: '#11131a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [GameScene]
});

window.addEventListener('resize', () => {
  game.scale.refresh();
});

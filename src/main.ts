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

const getViewportHeight = () => Math.floor(window.visualViewport?.height ?? window.innerHeight);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-wrap',
  width: Math.min(window.innerWidth, 430),
  height: getViewportHeight(),
  backgroundColor: '#11131a',
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [GameScene]
});

const resizeGame = () => {
  game.scale.resize(Math.min(window.innerWidth, 430), getViewportHeight());
};

window.addEventListener('resize', resizeGame);
window.visualViewport?.addEventListener('resize', resizeGame);

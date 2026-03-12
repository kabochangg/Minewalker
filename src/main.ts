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
const getDeviceResolution = () => Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);

const getGameWidth = () => Math.floor(Math.min(window.innerWidth, 430));
const getGameHeight = () => getViewportHeight();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-wrap',
  width: getGameWidth(),
  height: getGameHeight(),
  autoRound: true,
  backgroundColor: '#11131a',
  render: {
    antialias: true,
    roundPixels: true
  },
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: getDeviceResolution()
  },
  scene: [GameScene]
});

const resizeGame = () => {
  game.scale.setZoom(getDeviceResolution());
  game.scale.resize(getGameWidth(), getGameHeight());
};

window.addEventListener('resize', resizeGame);
window.visualViewport?.addEventListener('resize', resizeGame);

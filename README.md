<div align="center">
  <img src="public/muwanx_banner.png" alt="muwanx">
</div>
<div align="center">
    <em>MuJoCo + ONNX Reinforcement Learning Playground in Your Browser</em>
</div>

<br>

<p align="center">
    <a href="https://github.com/ttktjmt/muwanx/actions/workflows/deploy.yml"><img src="https://github.com/ttktjmt/muwanx/actions/workflows/deploy.yml/badge.svg" alt="GitHub Pages CI"/></a>
    <a href="https://github.com/ttktjmt/muwanx/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ttktjmt/muwanx" alt="License"/></a>
    <a href="https://deepwiki.com/ttktjmt/muwanx"><img src="https://img.shields.io/static/v1?label=%20&message=DeepWiki&color=0078D4&labelColor=555555&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAyCAYAAAAnWDnqAAAAAXNSR0IArs4c6QAAA05JREFUaEPtmUtyEzEQhtWTQyQLHNak2AB7ZnyXZMEjXMGeK/AIi+QuHrMnbChYY7MIh8g01fJoopFb0uhhEqqcbWTp06/uv1saEDv4O3n3dV60RfP947Mm9/SQc0ICFQgzfc4CYZoTPAswgSJCCUJUnAAoRHOAUOcATwbmVLWdGoH//PB8mnKqScAhsD0kYP3j/Yt5LPQe2KvcXmGvRHcDnpxfL2zOYJ1mFwrryWTz0advv1Ut4CJgf5uhDuDj5eUcAUoahrdY/56ebRWeraTjMt/00Sh3UDtjgHtQNHwcRGOC98BJEAEymycmYcWwOprTgcB6VZ5JK5TAJ+fXGLBm3FDAmn6oPPjR4rKCAoJCal2eAiQp2x0vxTPB3ALO2CRkwmDy5WohzBDwSEFKRwPbknEggCPB/imwrycgxX2NzoMCHhPkDwqYMr9tRcP5qNrMZHkVnOjRMWwLCcr8ohBVb1OMjxLwGCvjTikrsBOiA6fNyCrm8V1rP93iVPpwaE+gO0SsWmPiXB+jikdf6SizrT5qKasx5j8ABbHpFTx+vFXp9EnYQmLx02h1QTTrl6eDqxLnGjporxl3NL3agEvXdT0WmEost648sQOYAeJS9Q7bfUVoMGnjo4AZdUMQku50McDcMWcBPvr0SzbTAFDfvJqwLzgxwATnCgnp4wDl6Aa+Ax283gghmj+vj7feE2KBBRMW3FzOpLOADl0Isb5587h/U4gGvkt5v60Z1VLG8BhYjbzRwyQZemwAd6cCR5/XFWLYZRIMpX39AR0tjaGGiGzLVyhse5C9RKC6ai42ppWPKiBagOvaYk8lO7DajerabOZP46Lby5wKjw1HCRx7p9sVMOWGzb/vA1hwiWc6jm3MvQDTogQkiqIhJV0nBQBTU+3okKCFDy9WwferkHjtxib7t3xIUQtHxnIwtx4mpg26/HfwVNVDb4oI9RHmx5WGelRVlrtiw43zboCLaxv46AZeB3IlTkwouebTr1y2NjSpHz68WNFjHvupy3q8TFn3Hos2IAk4Ju5dCo8B3wP7VPr/FGaKiG+T+v+TQqIrOqMTL1VdWV1DdmcbO8KXBz6esmYWYKPwDL5b5FA1a0hwapHiom0r/cKaoqr+27/XcrS5UwSMbQAAAABJRU5ErkJggg==" alt="DeepWiki"/></a>
    <a href="https://ttktjmt.github.io/muwanx/"><img src="https://img.shields.io/badge/demo-🚀%20live-green" alt="Live Demo"/></a>
</p>

---

**Muwanx** is a client-side reinforcement learning playground powered by [mujoco_wasm](https://github.com/zalo/mujoco_wasm) and [ONNX Runtime](https://github.com/microsoft/onnxruntime). It enables real-time MuJoCo simulations with trained policy control, running entirely in your browser - no server for simulation required.  
Perfect for sharing interactive demos as static sites (such as GitHub Pages), rapidly prototyping RL policies, or building customizable environments for experimentation and visualization.

### 🚀 [Visit the Live Demo](https://ttktjmt.github.io/muwanx/)

## Features
- **Real-time**: Run MuJoCo simulations with real-time policy control.
- **Interactive**: Change the state of objects by applying forces.
- **Cross-platform**: Works seamlessly on desktop and mobile devices.
- **Client-only**: All computation runs in the browser. No server for simulation required.
- **Easy Sharing**: Host as a static site for effortless demo distribution (e.g., GitHub Pages).
- **Customizable**: Add your own MuJoCo models and ONNX policies quickly.

## Quick Start

To run muwanx locally, ensure you have [Node.js](https://nodejs.org/) installed.

Clone the repository:
```bash
git clone https://github.com/ttktjmt/muwanx.git
cd muwanx
```

Install the dependencies and start the development server:
```bash
npm install
npm run dev
```

Open your browser and navigate to the localhost URL shown in the terminal to see muwanx in action.

## Acknowledgments

This project has greatly benefited from the contributions of the [Facet](https://github.com/Facet-Team/facet) project by the research group at Tsinghua University.

## License

This project is licensed under the [MIT License](./LICENSE).

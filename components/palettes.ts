// This file centralizes the color palettes used across different charts in the application.

export const palettes = {
    Tableau10: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'],
    Viridis: ['#440154', '#3b528b', '#21918c', '#5dc863', '#fde725'],
    YlGn: ['#ffffd9', '#c7e9b4', '#74c476', '#238b45', '#005a32'],
    YlGnBu: ['#ffffd9', '#c7e9b4', '#41b6c4', '#225ea8', '#081d58'],
    Blues: ['#f7fbff', '#deebf7', '#9ecae1', '#3182bd', '#08519c'],
    BrBG: ['#8c510a', '#d8b365', '#f6e8c3', '#c7eae5', '#5ab4ac', '#01665e'],
    RdBu: ['#b2182b', '#ef8a62', '#fddbc7', '#d1e5f0', '#67a9cf', '#2166ac'],
    PiYG: ['#c51b7d', '#e9a3c9', '#fde0ef', '#e6f5d0', '#a1d76a', '#4d9221'],
    Paired: ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a'],
    Set2: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'],
    Greyscale: ['#000000', '#525252', '#737373', '#969696', '#bdbdbd', '#d9d9d9', '#f0f0f0'],
};
export type PaletteName = keyof typeof palettes;

// Helper to convert HEX to RGB array, needed for interpolation
export const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
};
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import HomePage from './app/page.tsx';

console.log(renderToStaticMarkup(HomePage()).substring(0, 200));

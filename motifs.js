const SVG_NS = 'http://www.w3.org/2000/svg';

function element(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function add(parent, name, attributes) {
  const node = element(name, attributes);
  parent.appendChild(node);
  return node;
}

function room(svg) {
  const window = add(svg, 'g', { opacity: '.63' });
  add(window, 'path', {
    d: 'M45 137V78a55 55 0 0 1 110 0v59M53 137V78a47 47 0 0 1 94 0v59M100 31v106M53 87h94M40 137h120M40 142h120',
  });

  const rain = add(svg, 'g', { opacity: '.27' });
  add(rain, 'path', {
    d: 'm77 48-4 9m13 12-4 9m35-31-4 9m20 13-4 9m-65 21-4 9m25-8-4 9m30-13-4 9m29 1-4 9m-60 5-3 7m45-9-4 9',
  });

  const lamp = add(svg, 'g', { opacity: '.72' });
  add(lamp, 'path', {
    d: 'M224 149v-38c0-15-8-26-23-28M199 77c-10 0-17 7-18 16h35c-1-9-8-16-17-16ZM180 97h37M196 98c0 4 5 4 5 0M212 149c0-5 5-8 12-8s12 3 12 8Z',
  });
  add(lamp, 'circle', { cx: '224', cy: '111', r: '2.5' });

  const book = add(svg, 'g', { opacity: '.8' });
  add(book, 'path', {
    d: 'M119 146c-12-8-25-9-42-7l-7 13c18-3 33-1 49 5 16-6 31-8 49-5l-7-13c-17-2-30-1-42 7Zm0 0v11M70 156c18-3 34-1 49 5 15-6 31-8 49-5M81 144c11-1 21 0 29 4m-31 1c11-1 19 1 27 3m22-4c8-4 18-5 29-4m-25 8c8-2 16-4 27-3',
  });

  add(svg, 'path', {
    d: 'M32 162h53m69 0h112M47 169h13m173 0h19',
    opacity: '.32',
  });
}

function classroom(svg) {
  const window = add(svg, 'g', { opacity: '.56' });
  add(window, 'path', {
    d: 'M43 30h155v108H43ZM49 36h143v96H49M120 36v96M49 82h143M37 138h167v5H37',
  });

  const campus = add(svg, 'g', { opacity: '.24' });
  add(campus, 'path', {
    d: 'M58 126v-20h48v20M54 106h56M65 112h6m10 0h6m10 0h3m-35 7h6m10 0h6m10 0h3M133 126h49',
  });
  add(campus, 'path', { d: 'M151 56c4 0 7 2 9 5 2-3 5-5 9-5' });

  const desk = add(svg, 'g', { opacity: '.67' });
  add(desk, 'path', {
    d: 'M129 149h126v6H129ZM137 155v18m109-18v18M144 160h95',
  });

  const books = add(svg, 'g', { opacity: '.76' });
  add(books, 'path', {
    d: 'M171 142h61v7h-61c-3 0-3-7 0-7ZM176 135h51v7h-51c-3 0-3-7 0-7M175 146h52M180 139h42M184 130h39v5h-39c-2 0-2-5 0-5',
  });

  add(svg, 'path', {
    d: 'M37 162h56m-47 7h13',
    opacity: '.25',
  });
}

const icons = {
  bookmark(svg) {
    add(svg, 'path', { d: 'M7 3.5h8l3 3V21l-6-4-6 4V4.5a1 1 0 0 1 1-1ZM15 3.5V7h3' });
  },
  arrow(svg) {
    add(svg, 'path', { d: 'M4 12h15m-6-6 6 6-6 6' });
  },
  search(svg) {
    add(svg, 'circle', { cx: '10.5', cy: '10.5', r: '6.5' });
    add(svg, 'path', { d: 'm15.2 15.2 5.3 5.3' });
  },
};

export function storyArt(kind = 'room') {
  const scenes = { room, classroom };
  const selectedKind = Object.hasOwn(scenes, kind) || Object.hasOwn(icons, kind) ? kind : 'room';
  const svg = element('svg', {
    class: `pm-art pm-art-${selectedKind}`,
    viewBox: Object.hasOwn(scenes, selectedKind) ? '0 0 300 180' : '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  (scenes[selectedKind] || icons[selectedKind])(svg);
  return svg;
}

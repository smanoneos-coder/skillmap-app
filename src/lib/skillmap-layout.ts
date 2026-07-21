import type { StudySkillMapNode } from "@/types/node";

type AutoArrangeDirection = "right" | "down" | "left" | "up";

type AutoArrangeBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const AUTO_LAYOUT_PRIMARY_GAP = 320;
const AUTO_LAYOUT_PERPENDICULAR_GAP = 150;
const AUTO_LAYOUT_ROOT_GAP = 220;
const AUTO_LAYOUT_NODE_WIDTH = 240;
const AUTO_LAYOUT_NODE_HEIGHT = 96;
const AUTO_LAYOUT_DIRECTIONS: AutoArrangeDirection[] = ["right", "down", "left", "up"];

export function autoArrangeStudySkillMap(skillMap: StudySkillMapNode): StudySkillMapNode {
  let nextRootTop = 0;
  const arrangedRoots = skillMap.children.map((rootNode) => {
    const arrangedRoot = arrangeRootNode(rootNode);
    const shiftX = -arrangedRoot.bounds.minX;
    const shiftY = nextRootTop - arrangedRoot.bounds.minY;
    const shiftedRoot = shiftStudySkillMapNode(arrangedRoot.node, shiftX, shiftY);

    nextRootTop += arrangedRoot.bounds.maxY - arrangedRoot.bounds.minY + AUTO_LAYOUT_ROOT_GAP;

    return shiftedRoot;
  });

  return {
    ...skillMap,
    positionX: null,
    positionY: null,
    children: arrangedRoots,
  };
}

function arrangeRootNode(node: StudySkillMapNode): {
  node: StudySkillMapNode;
  bounds: AutoArrangeBounds;
} {
  const childEntriesByDirection = new Map<
    AutoArrangeDirection,
    { child: StudySkillMapNode; index: number }[]
  >();

  AUTO_LAYOUT_DIRECTIONS.forEach((direction) => {
    childEntriesByDirection.set(direction, []);
  });

  node.children.forEach((child, index) => {
    const direction = AUTO_LAYOUT_DIRECTIONS[index % AUTO_LAYOUT_DIRECTIONS.length];
    childEntriesByDirection.get(direction)?.push({ child, index });
  });

  const arrangedChildrenByIndex = new Map<number, StudySkillMapNode>();
  let bounds = getNodeBounds(0, 0);

  for (const direction of AUTO_LAYOUT_DIRECTIONS) {
    const entries = childEntriesByDirection.get(direction) ?? [];
    const arrangedEntries = arrangeDirectionalChildren(entries, direction, 0, 1);

    arrangedEntries.forEach((entry) => {
      arrangedChildrenByIndex.set(entry.index, entry.node);
      bounds = mergeBounds(bounds, entry.bounds);
    });
  }

  return {
    node: {
      ...node,
      positionX: 0,
      positionY: 0,
      children: node.children.map((_, index) => arrangedChildrenByIndex.get(index)).filter(isStudySkillMapNode),
    },
    bounds,
  };
}

function arrangeDirectionalChildren(
  entries: { child: StudySkillMapNode; index: number }[],
  direction: AutoArrangeDirection,
  parentPerpendicularOffset: number,
  depth: number,
) {
  const totalSpan = entries.reduce(
    (span, entry) => span + measureDirectionalSpan(entry.child) * AUTO_LAYOUT_PERPENDICULAR_GAP,
    0,
  );
  let cursor = parentPerpendicularOffset - totalSpan / 2;

  return entries.map((entry) => {
    const childSpan = measureDirectionalSpan(entry.child) * AUTO_LAYOUT_PERPENDICULAR_GAP;
    const perpendicularOffset = cursor + childSpan / 2;
    const arrangedNode = arrangeDirectionalNode(entry.child, direction, perpendicularOffset, depth);

    cursor += childSpan;

    return {
      index: entry.index,
      ...arrangedNode,
    };
  });
}

function arrangeDirectionalNode(
  node: StudySkillMapNode,
  direction: AutoArrangeDirection,
  perpendicularOffset: number,
  depth: number,
): { node: StudySkillMapNode; bounds: AutoArrangeBounds } {
  const position = getDirectionalPosition(direction, depth, perpendicularOffset);
  let bounds = getNodeBounds(position.x, position.y);
  const childEntries = node.children.map((child, index) => ({ child, index }));
  const arrangedChildren = arrangeDirectionalChildren(
    childEntries,
    direction,
    perpendicularOffset,
    depth + 1,
  );
  const arrangedChildrenByIndex = new Map<number, StudySkillMapNode>();

  arrangedChildren.forEach((entry) => {
    arrangedChildrenByIndex.set(entry.index, entry.node);
    bounds = mergeBounds(bounds, entry.bounds);
  });

  return {
    node: {
      ...node,
      positionX: position.x,
      positionY: position.y,
      children: node.children.map((_, index) => arrangedChildrenByIndex.get(index)).filter(isStudySkillMapNode),
    },
    bounds,
  };
}

function measureDirectionalSpan(node: StudySkillMapNode): number {
  if (node.children.length === 0) {
    return 1;
  }

  return Math.max(1, node.children.reduce((span, child) => span + measureDirectionalSpan(child), 0));
}

function getDirectionalPosition(
  direction: AutoArrangeDirection,
  depth: number,
  perpendicularOffset: number,
) {
  if (direction === "right") {
    return {
      x: depth * AUTO_LAYOUT_PRIMARY_GAP,
      y: perpendicularOffset,
    };
  }

  if (direction === "left") {
    return {
      x: -depth * AUTO_LAYOUT_PRIMARY_GAP,
      y: perpendicularOffset,
    };
  }

  if (direction === "down") {
    return {
      x: perpendicularOffset,
      y: depth * AUTO_LAYOUT_PRIMARY_GAP,
    };
  }

  return {
    x: perpendicularOffset,
    y: -depth * AUTO_LAYOUT_PRIMARY_GAP,
  };
}

function getNodeBounds(x: number, y: number): AutoArrangeBounds {
  return {
    minX: x - AUTO_LAYOUT_NODE_WIDTH / 2,
    maxX: x + AUTO_LAYOUT_NODE_WIDTH / 2,
    minY: y - AUTO_LAYOUT_NODE_HEIGHT / 2,
    maxY: y + AUTO_LAYOUT_NODE_HEIGHT / 2,
  };
}

function mergeBounds(left: AutoArrangeBounds, right: AutoArrangeBounds): AutoArrangeBounds {
  return {
    minX: Math.min(left.minX, right.minX),
    maxX: Math.max(left.maxX, right.maxX),
    minY: Math.min(left.minY, right.minY),
    maxY: Math.max(left.maxY, right.maxY),
  };
}

function shiftStudySkillMapNode(
  node: StudySkillMapNode,
  shiftX: number,
  shiftY: number,
): StudySkillMapNode {
  return {
    ...node,
    positionX: node.positionX === null ? null : node.positionX + shiftX,
    positionY: node.positionY === null ? null : node.positionY + shiftY,
    children: node.children.map((child) => shiftStudySkillMapNode(child, shiftX, shiftY)),
  };
}

function isStudySkillMapNode(value: StudySkillMapNode | undefined): value is StudySkillMapNode {
  return Boolean(value);
}

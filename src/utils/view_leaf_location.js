/** @typedef {{parent?: WorkspaceLocationNode|null}} WorkspaceLocationNode */
/** @typedef {{leftSplit?: WorkspaceLocationNode|null, rightSplit?: WorkspaceLocationNode|null}} WorkspaceLocation */

/**
 * @param {WorkspaceLocationNode|null} node
 * @param {WorkspaceLocationNode|null|undefined} ancestor
 * @returns {boolean}
 */
export const is_descendant_of = (node, ancestor) => {
  let current = node;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parent;
  }
  return false;
};

/**
 * @param {{workspace: WorkspaceLocation, leaf: WorkspaceLocationNode|null}} params
 * @returns {'left'|'right'|'root'}
 */
export const get_leaf_location = ({ workspace, leaf }) => {
  if (!workspace || !leaf) {
    return 'root';
  }
  const { leftSplit, rightSplit } = workspace;
  if (is_descendant_of(leaf, leftSplit)) {
    return 'left';
  }
  if (is_descendant_of(leaf, rightSplit)) {
    return 'right';
  }
  return 'root';
};

/**
 * @param {{workspace: WorkspaceLocation, leaf: WorkspaceLocationNode|null, desired_location: string}} params
 * @returns {boolean}
 */
export const should_relocate_leaf = ({ workspace, leaf, desired_location }) => {
  if (!leaf || (desired_location !== 'left' && desired_location !== 'right')) {
    return false;
  }
  const leaf_location = get_leaf_location({ workspace, leaf });
  return leaf_location !== desired_location;
};

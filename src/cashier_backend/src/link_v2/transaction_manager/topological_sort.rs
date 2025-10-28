use cashier_backend_types::{error::CanisterError, link_v2::graph::Graph};
use std::collections::{HashMap, VecDeque};

/// Perform Kahn's algorithm for topological sorting
/// Returns a vector of levels, where each level is a vector of vertex IDs that can be
/// processed in parallel (i.e., have no dependencies among them)
/// # Arguments
/// * `graph` - A reference to the Graph to be sorted
/// # Returns
/// * `Result<Vec<Vec<String>>, CanisterError>` - A result containing the sorted levels
///   or an error if the graph has cycles
pub fn kahn_topological_sort(graph: &Graph) -> Result<Vec<Vec<String>>, CanisterError> {
    // Initialize in-degree map
    let mut in_degree = HashMap::<String, usize>::new();
    for vertex in graph.vertices.iter() {
        in_degree.insert(vertex.clone(), 0);
    }

    // Calculate in-degrees: for each edge from vertex to neighbor,
    // increment the neighbor's in-degree
    for (vertex, neighbors) in graph.adjacency_list.iter() {
        // Validate that vertex exists
        if !in_degree.contains_key(vertex) {
            return Err(CanisterError::from(format!(
                "Vertex '{}' in adjacency list not found in vertices",
                vertex
            )));
        }

        for neighbor in neighbors.iter() {
            // Validate that neighbor exists
            if !in_degree.contains_key(neighbor) {
                return Err(CanisterError::from(format!(
                    "Neighbor '{}' not found in vertices",
                    neighbor
                )));
            }
            *in_degree.get_mut(neighbor).unwrap() += 1;
        }
    }

    let mut zero_in_degree_queue = VecDeque::<String>::new();
    for (vertex, &degree) in in_degree.iter() {
        if degree == 0 {
            zero_in_degree_queue.push_back(vertex.clone());
        }
    }

    let mut visited_count = 0;
    let mut sorted_list = Vec::<Vec<String>>::new();

    while !zero_in_degree_queue.is_empty() {
        let level_size = zero_in_degree_queue.len();
        let mut current_level = Vec::new();

        // Process all vertices at the current level
        for _ in 0..level_size {
            let vertex = zero_in_degree_queue.pop_front().unwrap();
            current_level.push(vertex.clone());
            visited_count += 1;

            // Update neighbors
            if let Some(neighbors) = graph.adjacency_list.get(&vertex) {
                for neighbor in neighbors.iter() {
                    if let Some(degree) = in_degree.get_mut(neighbor) {
                        *degree -= 1;
                        if *degree == 0 {
                            zero_in_degree_queue.push_back(neighbor.clone());
                        }
                    }
                }
            }
        }
        sorted_list.push(current_level);
    }

    if visited_count != graph.vertices.len() {
        return Err(CanisterError::from(
            "Graph has at least one cycle, topological sort not possible",
        ));
    }

    Ok(sorted_list)
}

/// Flattens a sorted list of levels into a single list of vertex IDs
/// # Arguments
/// * `sorted_levels` - A reference to a vector of levels, where each level is a vector of vertex IDs
/// # Returns
/// * `Vec<String>` - A flattened vector of vertex IDs
pub fn flatten_sorted_list(sorted_levels: &[Vec<String>]) -> Vec<String> {
    let mut flat_list = Vec::<String>::new();
    for level in sorted_levels.iter() {
        for vertex in level.iter() {
            flat_list.push(vertex.clone());
        }
    }
    flat_list
}

/// Perform Kahn's topological sort and return a flat list of vertex IDs
/// # Arguments
/// * `graph` - A reference to the Graph to be sorted
/// # Returns
/// * `Result<Vec<String>, CanisterError>` - A result containing the sorted vertex IDs
///   or an error if the graph has cycles
pub fn kahn_topological_sort_flat(graph: &Graph) -> Result<Vec<String>, CanisterError> {
    let sorted_levels = kahn_topological_sort(graph)?;
    Ok(flatten_sorted_list(&sorted_levels))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn make_graph(vertices: &[&str], edges: &[(&str, &str)]) -> Graph {
        let vertices: Vec<String> = vertices.iter().map(|s| (*s).to_string()).collect();
        let mut adjacency_list: HashMap<String, Vec<String>> = HashMap::new();
        for (from, to) in edges {
            adjacency_list
                .entry((*from).to_string())
                .or_default()
                .push((*to).to_string());
        }
        Graph {
            vertices,
            adjacency_list,
        }
    }

    #[test]
    fn test_simple_topological_sort() {
        // A -> B -> C
        let graph = make_graph(&["A", "B", "C"], &[("A", "B"), ("B", "C")]);
        let sorted = kahn_topological_sort(&graph).unwrap();
        // Should be [[A], [B], [C]]
        assert_eq!(sorted.len(), 3);
        assert_eq!(sorted[0], vec!["A"]);
        assert_eq!(sorted[1], vec!["B"]);
        assert_eq!(sorted[2], vec!["C"]);
    }

    #[test]
    fn test_parallel_levels() {
        // A -> B, A -> C
        let graph = make_graph(&["A", "B", "C"], &[("A", "B"), ("A", "C")]);
        let sorted = kahn_topological_sort(&graph).unwrap();
        // Should be [[A], [B, C]] or [[A], [C, B]]
        assert_eq!(sorted.len(), 2);
        assert_eq!(sorted[0], vec!["A"]);
        let mut level1 = sorted[1].clone();
        level1.sort();
        assert_eq!(level1, vec!["B", "C"]);
    }

    #[test]
    fn test_cycle_detection() {
        // A -> B -> C -> A (cycle)
        let graph = make_graph(&["A", "B", "C"], &[("A", "B"), ("B", "C"), ("C", "A")]);
        let result = kahn_topological_sort(&graph);
        assert!(result.is_err());
        if let Err(e) = result {
            assert!(e.to_string().contains("cycle"));
        }
    }

    #[test]
    fn test_complex_topological_sort() {
        // Graph:
        //   A   B
        //   |\ /|
        //   | X |
        //   |/ \|
        //   C   D
        //   |   |
        //   E   F
        //   |   |
        //   G   G
        // Edges: A->C, A->D, B->C, B->D, C->E, D->F, E->G, F->G
        let graph = make_graph(
            &["A", "B", "C", "D", "E", "F", "G"],
            &[
                ("A", "C"),
                ("A", "D"),
                ("B", "C"),
                ("B", "D"),
                ("C", "E"),
                ("D", "F"),
                ("E", "G"),
                ("F", "G"),
            ],
        );

        let sorted = kahn_topological_sort(&graph).unwrap();

        // Expected levels: 1. A, B  2. C, D  3. E, F  4. G
        let mut level0 = sorted[0].clone();
        level0.sort();
        assert_eq!(level0, vec!["A", "B"]);
        let mut level1 = sorted[1].clone();
        level1.sort();
        assert_eq!(level1, vec!["C", "D"]);
        let mut level2 = sorted[2].clone();
        level2.sort();
        assert_eq!(level2, vec!["E", "F"]);
        assert_eq!(sorted[3], vec!["G"]);

        // All vertices should be present
        let all_sorted: Vec<String> = sorted.into_iter().flatten().collect();
        let mut expected: Vec<String> = vec!["A", "B", "C", "D", "E", "F", "G"]
            .into_iter()
            .map(|s| (*s).to_string())
            .collect();
        expected.sort();
        let mut all_sorted_sorted = all_sorted;
        all_sorted_sorted.sort();
        assert_eq!(all_sorted_sorted, expected);
    }

    #[test]
    fn test_complicated_cycle_detection() {
        // Graph with multiple interconnected cycles:
        // A -> B -> C -> D -> E -> F -> G -> H -> I -> J
        // And cycles: (A->C->A), (D->F->D), (G->I->G), (J->B->J)
        let graph = make_graph(
            &["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
            &[
                ("A", "B"),
                ("B", "C"),
                ("C", "D"),
                ("D", "E"),
                ("E", "F"),
                ("F", "G"),
                ("G", "H"),
                ("H", "I"),
                ("I", "J"),
                // Cycles
                ("A", "C"),
                ("C", "A"), // cycle 1
                ("D", "F"),
                ("F", "D"), // cycle 2
                ("G", "I"),
                ("I", "G"), // cycle 3
                ("J", "B"),
                ("B", "J"), // cycle 4
            ],
        );
        let result = kahn_topological_sort(&graph);
        assert!(result.is_err());
        if let Err(e) = result {
            assert!(e.to_string().contains("cycle"));
        }
    }
}

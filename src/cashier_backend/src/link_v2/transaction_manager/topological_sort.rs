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

pub fn flatten_sorted_list(sorted_levels: Vec<Vec<String>>) -> Vec<String> {
    let mut flat_list = Vec::<String>::new();
    for level in sorted_levels.iter() {
        for vertex in level.iter() {
            flat_list.push(vertex.clone());
        }
    }
    flat_list
}

pub fn kahn_topological_sort_flat(graph: &Graph) -> Result<Vec<String>, CanisterError> {
    let sorted_levels = kahn_topological_sort(graph)?;
    Ok(flatten_sorted_list(sorted_levels))
}

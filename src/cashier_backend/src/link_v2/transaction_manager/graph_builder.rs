use std::collections::HashMap;

pub struct Graph {
    pub vertices: Vec<String>,
    pub adjacency_list: HashMap<String, Vec<String>>,
}
impl Graph {
    pub fn new(vertices: Vec<String>, adjacency_list: HashMap<String, Vec<String>>) -> Self {
        Self {
            vertices,
            adjacency_list,
        }
    }
}

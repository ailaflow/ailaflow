# Process Editor

- The process editor needs to calculate multiple hashes using the `fnv1a` function. To reduce the performance impact, calculate them only once when the process is saved. Do not calculate hashes while mutating the process state.

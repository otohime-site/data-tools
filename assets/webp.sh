#!/bin/bash
for file in covers/*.png; do
    basename=$(basename "$file" .png)
    if [ ! -f "covers-webp/${basename}.webp" ]; then
        echo "Converting $file to covers-webp/${basename}.webp"
        convert "$file" "covers-webp/${basename}.webp"
    fi
done
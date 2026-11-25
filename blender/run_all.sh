#!/bin/bash
B="/c/Program Files/Blender Foundation/Blender 5.3/blender.exe"
cd /c/Users/Arda/wonderful-yeni
"$B" --background --python blender/scene_real.py -- hero "C:/Users/Arda/wonderful-yeni/blender/renders/hero" 72 cycles > blender/renders/hero.log 2>&1
"$B" --background --python blender/scene_real.py -- projects "C:/Users/Arda/wonderful-yeni/blender/renders/proj" cycles > blender/renders/proj.log 2>&1
echo ALLDONE > blender/renders/done.txt

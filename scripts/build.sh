cd src/arc-telemetry
npm i
cd ../..
mkdir -p build
rm -f build/extension.zip
cd src
zip -r ../build/extension.zip ./*

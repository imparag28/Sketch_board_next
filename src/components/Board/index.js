const { useRef, useEffect, useLayoutEffect } = require("react");
import { MENU_ITEMS } from "@/constants";
import { actionItemMenu } from "@/slice/menuSlice";
import { socket } from "@/socket";
import { useDispatch, useSelector } from "react-redux";
const Board = () => {
  const { activeMenuItem, actionMenuItem } = useSelector((state) => state.Menu);
  const { color, size } = useSelector((state) => state.Toolbox[activeMenuItem]);
  const dispach = useDispatch();

  const canvasRef = useRef(null);
  const shouldDraw = useRef(false);
  const drwaHistrory = useRef([]);
  const historyPointer = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    const changeConfig = (color,size) => {
      console.log(color,size)
      context.strokeStyle = color;
      context.lineWidth = size;
    };
    const handleChangeConfig = (config) =>{
      changeConfig(config.color,config.size)
    }

    changeConfig(color,size);
    socket.on('changeConfig',handleChangeConfig)

    return ()=>{
      socket.off('changeConfig',handleChangeConfig)
    }
  }, [color, size]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (actionMenuItem === MENU_ITEMS.DOWNLOAD) {
      const URL = canvas.toDataURL();
      const anchor = document.createElement("a");
      anchor.href = URL;
      anchor.download = "MyPainting.jpg";
      anchor.click();
    } else if (
      actionMenuItem === MENU_ITEMS.UNDO ||
      actionItemMenu === MENU_ITEMS.REDO
    ) {
      if (historyPointer.current > 0 && actionMenuItem === MENU_ITEMS.UNDO)
        historyPointer.current -= 1;
      if (historyPointer.current < drwaHistrory.current.length - 1 &&  actionMenuItem === MENU_ITEMS.REDO)
        historyPointer.current += 1;

      const imageData = drwaHistrory.current[historyPointer.current];
      context.putImageData(imageData, 0, 0);
    }
    dispach(actionItemMenu(null));
  }, [actionMenuItem]);

  //// THIS IS BEFOR BROWSWE PAINT
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const beginPath = (x, y) => {
      context.beginPath();
      context.moveTo(x, y);
    };

    const drawLiine = (x, y) => {
      context.lineTo(x, y);
      context.stroke();
    };

    const handleMouseDown = (e) => {
      shouldDraw.current = true;
      beginPath(e.clientX, e.clientY);
      socket.emit('beginPath',{x:e.clientX,y:e.clientY})
    };

    const handleMouseMove = (e) => {
      if (!shouldDraw.current) return;
      drawLiine(e.clientX, e.clientY);
      socket.emit('drawLine',{x:e.clientX,y:e.clientY} )
    
    };

    const handleMouseUp = (e) => {
      shouldDraw.current = false;
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      drwaHistrory.current.push(imageData);
      historyPointer.current = drwaHistrory.current.length - 1;
    };
    const handleBeginPath = (path) =>{
      beginPath(path.x,path.y)
    }

    const handleDrawLine = (path) => {
      drawLiine(path.x,path.y)
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    
    socket.on("beginPath",handleBeginPath)
    socket.on("drawLine",handleDrawLine)

    socket.on("connect", () => {
        console.log("-------cline conneted----"); // x8WIv7-mJelg7on_ALbx
      });

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);

      socket.off("beginPath",handleBeginPath)
      socket.off("drawLine",handleDrawLine)
    };
  }, []);
  return <canvas ref={canvasRef}></canvas>;
};

export default Board;

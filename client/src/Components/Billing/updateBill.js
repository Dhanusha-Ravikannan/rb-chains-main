import React, { useState, useEffect, useRef } from "react";
import {  Box, Button, Table, TableHead, TableCell, TableRow, TableBody} from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";
import { FaTrash } from "react-icons/fa";
import { useParams } from "react-router-dom"
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
 
 
 
const UpdateBill = () => {
  const [customers, setCustomers] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const billRef = useRef();
  const [totalPrice, setTotalPrice] = useState(0)
  const [balanceRow, setBalanceRow] = useState([])
  const [closing,setClosing]=useState(0)
  const [billNo,setBillNo]=useState(null)
  const {id}=useParams()
 
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productWeight, setProductWeight] = useState([])
  const [products, setProducts] = useState([]);
  const navigate=useNavigate()
 
 
 
    useEffect(() => {
      const fetchBill = async () => {
        try {
          const response = await axios.get(`${process.env.REACT_APP_BACKEND_SERVER_URL}/api/bill/getbill/${id}`);
          console.log('updatePageee', response);
   
          const billData = response.data[0]; // assuming response.data is an array with a single object
   
          setBillNo(id);
   
          // Set customer info
          setSelectedCustomer(billData.CustomerInfo);
   
          // Set order items
          const formattedItems = billData.OrderItems.map(item => ({
            productName: item.itemName,
            productTouch: item.touchValue,
            productWeight: item.productWeight,
            productPure: item.final_price,
            stockId: item.stock_id
          }));
          setBillItems(formattedItems);
   
          // Set balance rows if available
          if (billData.Balance && billData.Balance.length > 0) {
            setBalanceRow(billData.Balance);
            setClosing  ( billData.Balance[billData.Balance.length-1].
              remaining_gold_balance
              )
          }
          else{
            setClosing( billData.total_price)
          }
   
        } catch (err) {
          alert(err.message);
        }
      };
   
      fetchBill();
    }, []);
   
 
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDate(now.toLocaleDateString("en-IN"));
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
 
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);
 
  useEffect(() => {
 
    setTotalPrice(calculateTotal(billItems))
 
  }, [billItems])
 
 
  useEffect(() => {
    const receivedGold = calculateClosing(balanceRow);
    const updatedClosing = totalPrice - receivedGold;
    setClosing(updatedClosing);
  }, [balanceRow, totalPrice]);
 
 
 
 
  const calculateTotal = (billItems) => {
    return billItems.reduce((acc, currValue) => {
      return acc + currValue.productPure
    }, 0)
  };
 
 
 
  const calculateClosing = (balanceRow) => {
    return balanceRow.reduce((acc, currValue) => {
     
      return acc + currValue.gold_pure
    }, 0)
  };
 
  const handleBalanceRow = () => {
    if(selectedCustomer){
      const tempRow = [...balanceRow, { 'id':undefined,'customer_id':selectedCustomer.customer_id,'gold_weight': 0, 'gold_touch': 0, 'gold_pure': 0 }]
      setBalanceRow(tempRow)
    }
  }
  const handleBalanceInputChange = (index, field, value) => {
    const updatedRows = [...balanceRow];
    updatedRows[index][field] = value;
 
    if(field==="gold_touch"){
     updatedRows[index]['gold_pure']=updatedRows[index]['gold_weight'] *  updatedRows[index]['gold_touch']/100;
    }
 
    setBalanceRow(updatedRows);
  };
  const handleRemoveBalanceRow=(index)=>{
   
    const tempBalRow=[...balanceRow]
    tempBalRow.splice(index,1)
    setBalanceRow(tempBalRow)
  }
 
 
 
 
  const handleProductSelect = (itemIndex,stockId) => {
    const tempProducts = [...productWeight]
    const tempSelectProduct = tempProducts.filter((item, index) => itemIndex === index)
    console.log('masterjewelid', selectedProduct.master_jewel_id)
    const customerData = customers.filter((item, index) => item.customer_id === selectedCustomer.customer_id)
    const filterMasterItem = customerData[0].MasterJewelTypeCustomerValue.filter((item, index) => item.masterJewel_id === selectedProduct.master_jewel_id)
    if (filterMasterItem.length === 0) {
      alert('Percentage is Required')
    } else {
      const billObj = {
        productName: tempSelectProduct[0].item_name,
        productTouch: tempSelectProduct[0].touchValue,
        productWeight: tempSelectProduct[0].value,
        productPure: 0,
        stockId:stockId
      }
 
      billObj.productPure = ((billObj.productTouch + filterMasterItem[0].value) * billObj.productWeight) / 100
      console.log('pure', billObj.productPure)
      const tempBill = [...billItems]
      tempBill.push(billObj)
      setBillItems(tempBill)
      tempProducts.splice(itemIndex, 1)
      setProductWeight(tempProducts)
 
    }
 
 
  };
 
  const handleSaveBill = async() => {
    // validation for bill
    if(!selectedCustomer){
      alert('Customer Name is Required')
    }
    if(!selectedProduct){
        alert('Jewel Name is Required')
    }
   
    else{
       if(selectedCustomer){
 
        const payLoad = {
          "customer_id": selectedCustomer.customer_id,
          "order_status": "completed",
          "totalPrice": totalPrice,
          "orderItems":billItems,
          "balance":balanceRow,
          "closingbalance":(closing).toFixed(2)
         
        }
         console.log('payload', payLoad)
 
        try{
            const response= await axios.post(`${process.env.REACT_APP_BACKEND_SERVER_URL}/api/bill/saveBill`,payLoad);
            if(response.status===201){
              console.log(response.data.data.id)
               navigate(`/billing/${response.data.data.id}`)
            }
          }catch(err){
               alert(err.message)
          }
         
         
       }else{
        alert('Products is Required')
       }
   
    }
   
   
  }
 
 
  const handleDownloadPdf = () => {
    setIsPrinting(true);
 
    setTimeout(() => {
      const input = billRef.current;
 
      if (!input) return;
 
      html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
 
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
 
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Bill-${billNo || 'download'}.pdf`);
        setIsPrinting(false);
      });
    }, 300); // slight delay to allow re-render before taking screenshot
  };
 
 
 
  return (
    <>
   
 
<Box sx={styles.wrapper}>
      <Box sx={styles.leftPanel} ref={billRef}>
        <h1 style={styles.heading}>Estimate Only</h1>
     
 
<Box sx={styles.billHeader}>
  <Box sx={styles.billNumber}>
    <p><strong>Bill No: {id}</strong></p>
  </Box>
  <Box sx={styles.billInfo}>
    <p>
      <strong>Date:</strong> {date}<br /> <br/>
      <strong>Time:</strong> {time}
    </p>
  </Box>
</Box>
 
 
 
        {selectedCustomer && (
          <Box sx={styles.customerDetails}>
            <h3>Customer Info</h3>
            <p><strong>Name:</strong> {selectedCustomer.customer_name}</p>
            <p><strong>Phone:</strong> {selectedCustomer.phone_number}</p>
            <p><strong>Address:</strong> {selectedCustomer.address}</p>
            <p><strong>Shop Name:</strong> {selectedCustomer.customer_shop_name}</p>
          </Box>
        )}
 
       
 
     
 
        <Box sx={styles.itemsSection}>
          <h3>Order Items:</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Touch</th>
                <th style={styles.th}>Weight</th>
                <th style={styles.th}>Pure</th>
              </tr>
            </thead>
            <tbody>
              {billItems.length > 0 ? (
                billItems.map((item, index) => (
                  <tr key={index}>
                    <td style={styles.td}>{item.productName}</td>
                    <td style={styles.td}>{item.productTouch}</td>
                    <td style={styles.td}>{item.productWeight}</td>
                    <td style={styles.td}>{item.productPure}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    style={{ textAlign: "center", padding: "10px" }}
                  >
                    No products selected
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan="3" style={styles.td}>
                  <strong>Total</strong>
                </td>
                <td style={styles.td}>{totalPrice}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td>
           
                  {!isPrinting && (
  <Button
    variant="contained"
    color="primary"
    onClick={handleBalanceRow}
    sx={styles.balanceButton}
  >
    +
  </Button>
)}
 
                  </td>
 
              </tr>
            </tbody>
          </table>
          <h3>Recevied Details:</h3>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Given Gold</TableCell>
                <TableCell>Touch</TableCell>
                <TableCell>Weight</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
           {balanceRow.map((row, index) => (
                <TableRow key={index}>
                  <TableCell >
                    <input                    
                      type="number"                      
                      value={row.gold_weight}
                      onChange={(e) =>
                        handleBalanceInputChange(index, "gold_weight", e.target.value)
                      }
                      style={styles.input}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      placeholder="Touch"
                      value={row.gold_touch}
                      onChange={(e) =>
                        handleBalanceInputChange(index, "gold_touch", e.target.value)
                      }
                      style={styles.input}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      placeholder="Weight"
                      value={(row.gold_pure).toFixed(3)}
                      style={styles.input}
                    />
                  </TableCell>
                  <TableCell>
                    <Button style={styles.delButton} onClick={(e)=>{handleRemoveBalanceRow(index)}}><FaTrash></FaTrash></Button>
                  </TableCell>
                 
                </TableRow>
              ))}
              <TableRow>
                <TableCell >Closing</TableCell>
                <TableCell ></TableCell>
                <TableCell ></TableCell>
                {/* <TableCell >{(closing).toFixed(2)}</TableCell> */}
                <TableCell>{Number(balanceRow.length === 0 ? totalPrice : closing).toFixed(2)}</TableCell>
               
              </TableRow>
            </TableBody>
          </Table>
        </Box>
 
       
{!isPrinting && (
  <>
    <Button
      variant="contained"
      color="primary"
      onClick={handleSaveBill}
      sx={styles.saveButton}
    >
      Save
    </Button>
 
    <Button
      variant="contained"
      color="primary"
      onClick={handleDownloadPdf}
    >
      Download as Pdf
    </Button>
  </>
)}
 
      </Box>
    </Box>
 
    </>
   
 
  );
};
 
const styles = {
  wrapper: {
    display: "flex",
    gap: "20px",
    alignItems: "flex-start",
    padding: "20px",
  },
  leftPanel: {
    width: "60%",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "10px",
    backgroundColor: "#f9f9f9",
    fontFamily: "Arial, sans-serif",
    marginLeft:'17rem'
  },
  rightPanel: {
    width: "40%",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "10px",
    backgroundColor: "#fff",
    fontFamily: "Arial, sans-serif",
  },
  heading: { textAlign: "center", color: "black" },
 
  searchSection: { display: "flex", gap: "10px", marginBottom: "20px" },
  smallAutocomplete: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: "5px",
  },
  customerDetails: {
    marginBottom: "20px",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    backgroundColor: "#fff",
  },
  itemsSection: { marginTop: "20px" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    border: "1px solid #ddd",
    padding: "10px",
    backgroundColor: "#f2f2f2",
    textAlign: "left",
    fontWeight: "bold",
  },
  td: {
    border: "1px solid #ddd",
    padding: "10px",
    textAlign: "left",
  },
  saveButton: {
    marginTop: "20px",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
  },
  balanceButton: {
    margin: "10px",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
    fontSize: "18 px"
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
    fontFamily: "inherit",
    backgroundColor: "#fff",
    boxSizing: "border-box",
    outline: "none",
  },
  delButton:{
    margin: "10px",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
    fontSize: "20px"
  },
  billHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  },
  billNumber: {
    flex: 1
  },
  billInfo: {
    flex: 1,
    textAlign: "right",
    marginBottom: "20px",
   
  },
   
 
};
 
 
export default UpdateBill;
 
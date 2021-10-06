// SPDX-License-Identifier:  Apache License
pragma solidity >= 0.8.0;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract MarketPlace is IERC721Receiver {
    using SafeMath for uint;
    struct Order {
        
        uint256 idNFT;
        address currencyCode; // UNIQ tokens as address address (1); wKSM 
        uint256 price;
        uint256 time;
        address idCollection;
        address ownerAddr;
        uint8 flagActive;        
    }
    Order[] public  orders;

    mapping (address => mapping (address => uint256)) public balanceKSM;  //  [ownerAddr][currency] => [KSMs]
    mapping (address => mapping (uint256 => uint256)) public  asks ; // [buyer][idCollection][idNFT] => idorder

    mapping (address => uint[]) public asksbySeller; // [addressSeller] =>idorder

    address escrow;
    address owner;

    constructor (address _escrow) {
        escrow = _escrow;
        owner = msg.sender;

    }

   function setowner  (address _newEscrow) public onlyOwner {
        escrow = _newEscrow;
    }

    function setEscrow  (address _newEscrow) public onlyOwner {
        escrow = _newEscrow;
    }

    modifier onlyEscrow () {
        require(msg.sender == escrow, "Only escrow can");
        _;
    }

    modifier onlyOwner () {
        require(msg.sender == owner, "Only owner can");
        _;
    }

    /**
    * Make bids (orders) to sell NFTs 
    */
    
    receive  () external payable {
        revert ("Can't accept payment without collection and IDs, use dApp to send");
    }
    fallback () external payable {
        revert ("No such function");
    }

    function addAsk (uint256 _price, 
                    address  _currencyCode, 
                    address _idCollection, 
                    uint256 _idNFT
                  ) public  { //
        address ownerNFT = IERC721(_idCollection).ownerOf(_idNFT);
        require (ownerNFT == msg.sender, "Only token owner can make ask");
        
            orders.push(Order(        
                    _idNFT,
                    _currencyCode,
                    _price,
                    block.timestamp,
                    _idCollection,
                    msg.sender,
                    1 // 1 = is active
             ));
            asks[_idCollection][_idNFT] = orders.length-1;
            asksbySeller[msg.sender].push(orders.length-1);
            IERC721(_idCollection).transferFrom(msg.sender, address(this), _idNFT);
            
    }

    function editAsk (uint256 _price, 
                    address  _currencyCode, 
                    address _idCollection, 
                    uint256 _idNFT,
                    uint8  _active) public {
        

        uint orderID =  asks[_idCollection][_idNFT];

        require (orders[orderID].ownerAddr == msg.sender, "Only token owner can edit ask");
        require (orders[orderID].flagActive != 0, "This ask is closed");
        if (_price> 0 ) {
            orders[orderID].price = _price ;  
        }
        
        if (_currencyCode != address(0) ) {
            orders[orderID].currencyCode = _currencyCode ;  
        }

        orders[orderID].time = block.timestamp;
        orders[orderID].flagActive = _active;
        
        }



    function deposit (uint256 _amount, address _currencyCode, address _sender) public onlyEscrow {

        balanceKSM[_sender][_currencyCode]= balanceKSM[_sender][_currencyCode].add(_amount);

    }

    function buyKSM (address _idCollection, uint256 _idNFT ) public {
        
        Order memory order = orders[ asks[_idCollection][_idNFT]];
        //1. reduce balance
        balanceKSM[msg.sender][order.currencyCode] = balanceKSM[msg.sender][order.currencyCode].sub( order.price, "Insuccificient KSMs funds");
        // 2. close order
        orders[ asks[_idCollection][_idNFT]].flagActive = 0;
        // 3. transfer NFT to buyer
        IERC721(_idCollection).transferFrom(address(this), msg.sender, _idNFT);


    }
    function buyUNQ (address _idCollection, uint256 _idNFT ) public payable { //buing for UNQ like as ethers 
        
        Order memory order = orders[asks[_idCollection][_idNFT]]; 
        //1. check sent amount and send to seller
        require (msg.value == order.price, "Not right amount UNQ sent, have to be equal price" );     
        payable(order.ownerAddr).transfer(order.price); 
        // 2. close order
        orders[ asks[_idCollection][_idNFT]].flagActive = 0;
        // 3. transfer NFT to buyer
        IERC721(_idCollection).transferFrom(address(this), msg.sender, _idNFT);


    }


    function buy (address _idCollection, uint256 _idNFT, address _currencyCode, uint _amount ) public payable {
        
        Order memory order = orders[ asks[_idCollection][_idNFT]];
        //1. check sent amount and transfer from buyer to seller
        require (order.price == _amount && order.currencyCode == _currencyCode, "Not right amount or currency sent, have to be equal currency and price" );
        // !!! transfer have to be approved to marketplace!
        IERC20(order.currencyCode).transferFrom(msg.sender, address(this), order.price); //to not disclojure buyer's address 
        IERC20(order.currencyCode).transfer(order.ownerAddr, order.price);
        // 2. close order
        orders[ asks[_idCollection][_idNFT]].flagActive = 0;
        // 3. transfer NFT to buyer
        IERC721(_idCollection).transferFrom(address(this), msg.sender, _idNFT);


    }


    function withdrawKSM (uint256 _amount, address _currencyCode, address _sender) public  onlyEscrow returns (bool ){
        balanceKSM[_sender][_currencyCode] = balanceKSM[_sender][_currencyCode].sub( _amount, "Insuccificient KSMs balance");
        return true;

    }

    function withdraw (uint256 _amount, address _currencyCode, address payable _sender) public  onlyEscrow returns (bool ){
        balanceKSM[_sender][_currencyCode] = balanceKSM[_sender][_currencyCode].sub( _amount, "Insuccificient balance");
        if (_currencyCode !=address (1)) { //erc20 compat. tokens on UNIQUE chain
            IERC20(_currencyCode).transfer(_sender, _amount);
        } else {
            (_sender).transfer(_amount); // for UNQ like as ethers 
        }
        return true;

    }

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)  public override pure returns(bytes4) {
            return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
        }
}
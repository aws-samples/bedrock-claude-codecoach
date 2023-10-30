

export default function expiredAt(count:number, unit?:string):Date{
   
        const defaultCount = 45;
        const defaultUnit = "d";  //default to 45 days
        const  units = {"s" : 1000, "m" : 60000, "h" : 3600000, "d" : 86400000, "w" : 604800000, "y" : 31536000000 };  //number of milliseconds per unit
          
        const currentCount = (count??defaultCount);
        if (unit){      
         const currentUnit:number = (units.hasOwnProperty(unit)?units[unit]:units[defaultUnit]);
        }
        const currentUnit:number = (units[defaultUnit]);
    
        const d = new Date();
        const  e = new Date(d.getTime()+(currentCount*currentUnit));
        return e;    
   
}